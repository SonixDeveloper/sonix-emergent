"""Cryptography utilities - NaCl/libsodium for E2E encryption."""
from __future__ import annotations

import base64

from nacl.encoding import Base64Encoder
from nacl.public import Box, PrivateKey, PublicKey
from nacl.secret import SecretBox
from nacl.utils import random


class CryptoManager:
    """Manages NaCl keypairs and encryption/decryption operations."""

    def __init__(self, private_key_b64: str | None = None) -> None:
        if private_key_b64:
            self._private = PrivateKey(
                private_key_b64.encode(), encoder=Base64Encoder
            )
        else:
            self._private = PrivateKey.generate()
        self._public = self._private.public_key

    @property
    def private_key_b64(self) -> str:
        return self._private.encode(encoder=Base64Encoder).decode()

    @property
    def public_key_b64(self) -> str:
        return self._public.encode(encoder=Base64Encoder).decode()

    # Asymmetric encryption (for E2E messages)
    def encrypt_for(self, recipient_pub_b64: str, plaintext: bytes) -> str:
        """Encrypt message for a recipient using their public key."""
        recipient_pub = PublicKey(recipient_pub_b64.encode(), encoder=Base64Encoder)
        box = Box(self._private, recipient_pub)
        ciphertext = box.encrypt(plaintext, encoder=Base64Encoder)
        return ciphertext.decode()

    def decrypt_from(self, sender_pub_b64: str, ciphertext_b64: str) -> bytes:
        """Decrypt message from a sender using their public key."""
        sender_pub = PublicKey(sender_pub_b64.encode(), encoder=Base64Encoder)
        box = Box(self._private, sender_pub)
        return box.decrypt(ciphertext_b64.encode(), encoder=Base64Encoder)

    # Symmetric encryption (for local storage, file encryption)
    @staticmethod
    def generate_symmetric_key() -> str:
        key = random(SecretBox.KEY_SIZE)
        return base64.b64encode(key).decode()

    @staticmethod
    def encrypt_symmetric(key_b64: str, plaintext: bytes) -> str:
        key = base64.b64decode(key_b64)
        box = SecretBox(key)
        nonce = random(SecretBox.NONCE_SIZE)
        ciphertext = box.encrypt(plaintext, nonce, encoder=Base64Encoder)
        return ciphertext.decode()

    @staticmethod
    def decrypt_symmetric(key_b64: str, ciphertext_b64: str) -> bytes:
        key = base64.b64decode(key_b64)
        box = SecretBox(key)
        return box.decrypt(ciphertext_b64.encode(), encoder=Base64Encoder)


# Password hashing (Argon2id via passlib)
def hash_password(password: str) -> str:
    from passlib.hash import argon2
    return argon2.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    from passlib.hash import argon2
    return argon2.verify(password, hashed)