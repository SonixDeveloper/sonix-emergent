package io.github.sonixdeveloper.sonix;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.view.WindowInsets;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.util.ArrayList;

public final class MainActivity extends Activity {
    private static final String LAUNCHER = "https://sonixapp-community.urbanclover.chatgpt.site/";
    private static final String SONIX_HOST = "sonixapp-community.urbanclover.chatgpt.site";
    private static final int MEDIA_REQUEST = 1;
    private static final int FILE_REQUEST = 2;
    private WebView web;
    private String previewHost;
    private PermissionRequest mediaRequest;
    private ValueCallback<Uri[]> fileResult;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        previewHost = SONIX_HOST;
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(16, 13, 18));
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri url = request.getUrl();
                if (LAUNCHER.equals(url.toString())) {
                    previewHost = SONIX_HOST;
                    return false;
                }
                String host = url.getHost();
                if ("https".equals(url.getScheme()) && host != null && url.getPort() == -1) {
                    if (SONIX_HOST.equals(host)) {
                        previewHost = host;
                        return false;
                    }
                    if (host.equals(previewHost)) return false;
                    if (previewHost == null && host.matches("[a-z0-9-]+\\.trycloudflare\\.com")
                            && LAUNCHER.equals(view.getUrl())) {
                        previewHost = host;
                        return false;
                    }
                }
                if ("https".equals(url.getScheme()) || "http".equals(url.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, url)); }
                    catch (ActivityNotFoundException ignored) {
                        Toast.makeText(MainActivity.this, "No browser available", Toast.LENGTH_SHORT).show();
                    }
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                if (previewHost == null || !"https".equals(request.getOrigin().getScheme())
                        || !previewHost.equals(request.getOrigin().getHost())
                        || request.getOrigin().getPort() != -1 || mediaRequest != null) {
                    request.deny();
                    return;
                }
                ArrayList<String> missing = new ArrayList<>();
                for (String resource : request.getResources()) {
                    String permission = androidPermission(resource);
                    if (permission != null && checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED
                            && !missing.contains(permission)) missing.add(permission);
                }
                if (missing.isEmpty()) finishMediaRequest(request);
                else {
                    mediaRequest = request;
                    requestPermissions(missing.toArray(new String[0]), MEDIA_REQUEST);
                }
            }

            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (mediaRequest == request) mediaRequest = null;
            }

            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> result, FileChooserParams options) {
                if (fileResult != null) fileResult.onReceiveValue(null);
                fileResult = result;
                try { startActivityForResult(options.createIntent(), FILE_REQUEST); }
                catch (ActivityNotFoundException ignored) {
                    fileResult = null;
                    result.onReceiveValue(null);
                }
                return true;
            }
        });
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            FrameLayout content = new FrameLayout(this);
            content.setBackgroundColor(Color.rgb(16, 13, 18));
            content.addView(web, new FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
            content.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
                @Override public WindowInsets onApplyWindowInsets(View view, WindowInsets insets) {
                    android.graphics.Insets bars = insets.getInsets(
                            WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                    android.graphics.Insets keyboard = insets.getInsets(WindowInsets.Type.ime());
                    view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
                    return insets;
                }
            });
            setContentView(content);
            content.requestApplyInsets();
        } else {
            getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
            setContentView(web);
        }
        web.loadUrl(LAUNCHER);
    }

    private static String androidPermission(String resource) {
        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) return Manifest.permission.RECORD_AUDIO;
        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) return Manifest.permission.CAMERA;
        return null;
    }

    private void finishMediaRequest(PermissionRequest request) {
        ArrayList<String> granted = new ArrayList<>();
        for (String resource : request.getResources()) {
            String permission = androidPermission(resource);
            if (permission != null && checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) granted.add(resource);
        }
        if (granted.isEmpty()) request.deny();
        else request.grant(granted.toArray(new String[0]));
    }

    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code == MEDIA_REQUEST && mediaRequest != null) {
            PermissionRequest request = mediaRequest;
            mediaRequest = null;
            finishMediaRequest(request);
        }
    }

    @Override protected void onActivityResult(int code, int result, Intent intent) {
        super.onActivityResult(code, result, intent);
        if (code == FILE_REQUEST && fileResult != null) {
            ValueCallback<Uri[]> callback = fileResult;
            fileResult = null;
            callback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, intent));
        }
    }

    @Override public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    @Override protected void onDestroy() {
        if (mediaRequest != null) mediaRequest.deny();
        if (fileResult != null) fileResult.onReceiveValue(null);
        web.destroy();
        super.onDestroy();
    }
}
