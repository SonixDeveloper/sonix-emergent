"use strict";

// Each participant joins with an ephemeral peer ID. Media is sent directly
// between browsers, while Sonix forwards offers, answers, and ICE candidates.
class SonixVoice {
  constructor(stream, endpoint, onStatus, videoGrid) {
    this.stream = stream;
    this.videoGrid = videoGrid;
    this.videoTrack = null;
    this.screenTrack = null;
    this.deafened = false;
    this.peers = new Map();
    this.onStatus = onStatus;
    this.socket = new WebSocket(endpoint);
    this.socket.onopen = () => onStatus("Connected to voice");
    this.socket.onmessage = event => {
      this.queue = (this.queue || Promise.resolve()).then(() => this.receive(JSON.parse(event.data)))
        .catch(() => onStatus("A voice peer could not connect."));
    };
    this.socket.onclose = () => {
      this.stop();
      onStatus("Disconnected from voice");
    };
  }

  send(to, signal) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({to, signal}));
    }
  }

  connection(id, offering = false) {
    if (this.peers.has(id)) return this.peers.get(id);
    const connection = new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]});
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.muted = this.deafened;
    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.hidden = true;
    const screen = document.createElement("video");
    screen.autoplay = true;
    screen.playsInline = true;
    screen.muted = true;
    screen.hidden = true;
    this.videoGrid.append(video,screen);
    for (const track of this.stream.getAudioTracks()) connection.addTrack(track, this.stream);
    const videoSender = offering ? connection.addTransceiver(this.videoTrack || "video", {direction:"sendrecv"}).sender : null;
    const screenSender = offering ? connection.addTransceiver(this.screenTrack || "video", {direction:"sendrecv"}).sender : null;
    const peer = {connection, audio, video, screen, videoSender, screenSender, candidates:[]};
    this.peers.set(id, peer);
    connection.ontrack = event => {
      const {track} = event;
      const videoTransceivers = connection.getTransceivers().filter(item => item.receiver.track.kind === "video");
      const view = track.kind === "audio" ? audio : event.transceiver === videoTransceivers[1] ? screen : video;
      view.srcObject = new MediaStream([track]);
      if (track.kind === "video") {
        view.hidden = track.muted;
        track.onmute = () => { view.hidden = true; };
        track.onunmute = () => { view.hidden = false; };
      }
      view.play().catch(() => this.onStatus("Your browser blocked automatic media playback."));
    };
    connection.onicecandidate = event => {
      if (event.candidate) this.send(id, {candidate:event.candidate.toJSON()});
    };
    return peer;
  }

  async receive(message) {
    if (this.stopped) return;
    if (message.peers) {
      for (const id of message.peers) {
        const {connection} = this.connection(id, true);
        await connection.setLocalDescription(await connection.createOffer());
        this.send(id, {description:connection.localDescription});
      }
    } else if (message.left) {
      this.remove(message.left);
    } else if (message.from && message.signal) {
      const id = message.from;
      const peer = this.connection(id);
      const {connection, candidates} = peer;
      const {description, candidate} = message.signal;
      if (description) {
        await connection.setRemoteDescription(description);
        for (const queued of candidates.splice(0)) await connection.addIceCandidate(queued);
        if (description.type === "offer") {
          const videos = connection.getTransceivers().filter(item => item.receiver.track.kind === "video");
          for (const [index, transceiver] of videos.entries()) {
            transceiver.direction = "sendrecv";
            const slot = index === 0 ? "videoSender" : "screenSender";
            peer[slot] = transceiver.sender;
            await peer[slot].replaceTrack(index === 0 ? this.videoTrack : this.screenTrack);
          }
          await connection.setLocalDescription(await connection.createAnswer());
          this.send(id, {description:connection.localDescription});
        }
      } else if (candidate) {
        if (connection.remoteDescription) await connection.addIceCandidate(candidate);
        else candidates.push(candidate);
      }
    }
  }

  setVideo(track, kind = "camera") {
    const change = (this.queue || Promise.resolve()).then(() => this.replaceVideo(track, kind));
    this.queue = change.catch(() => {});
    return change;
  }

  async replaceVideo(track, kind) {
    if (this.stopped) {
      track?.stop();
      return;
    }
    const trackSlot = kind === "screen" ? "screenTrack" : "videoTrack";
    const senderSlot = kind === "screen" ? "screenSender" : "videoSender";
    const previous = this[trackSlot];
    const senders = Array.from(this.peers.values(), peer => peer[senderSlot]).filter(Boolean);
    try {
      await Promise.all(senders.map(sender => sender.replaceTrack(track)));
      if (this.stopped) track?.stop();
      else this[trackSlot] = track;
    } catch (error) {
      await Promise.allSettled(senders.map(sender => sender.replaceTrack(previous)));
      track?.stop();
      throw error;
    } finally {
      if (this[trackSlot] === track) previous?.stop();
    }
  }

  setDeafened(deafened) {
    this.deafened = deafened;
    for (const {audio} of this.peers.values()) audio.muted = deafened;
  }

  remove(id) {
    const peer = this.peers.get(id);
    if (!peer) return;
    peer.connection.close();
    peer.audio.srcObject = null;
    peer.video.srcObject = null;
    peer.video.remove();
    peer.screen.srcObject = null;
    peer.screen.remove();
    this.peers.delete(id);
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.socket.onclose = null;
    this.socket.close();
    this.videoTrack?.stop();
    this.screenTrack?.stop();
    this.videoTrack = null;
    this.screenTrack = null;
    for (const track of this.stream.getTracks()) track.stop();
    for (const id of this.peers.keys()) this.remove(id);
  }
}
