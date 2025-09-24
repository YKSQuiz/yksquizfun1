package com.yksquiz.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.view.KeyEvent;
import android.webkit.WebResourceRequest;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import com.onesignal.OneSignal;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // OneSignal başlatma
        OneSignal.initWithContext(this, "ec6a93b8-6aa2-4355-a5be-c4a0abf0af9f");
        
        // WebView ayarları
        WebView webView = getBridge().getWebView();
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setAllowFileAccess(true);
        webView.getSettings().setAllowContentAccess(true);
        webView.getSettings().setLoadsImagesAutomatically(true);
        webView.getSettings().setMixedContentMode(0); // MIXED_CONTENT_ALWAYS_ALLOW
        
        // JavaScript interface ekle
        webView.addJavascriptInterface(new WebAppInterface(), "Android");
        
        // WebView için geri tuşu yönetimi
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                view.loadUrl(request.getUrl().toString());
                return true;
            }
            
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });
        
        webView.setWebChromeClient(new WebChromeClient());
    }
    
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        WebView webView = getBridge().getWebView();
        
        // Geri tuşuna basıldığında
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            // JavaScript'e geri tuşu olayını gönder
            webView.evaluateJavascript(
                "if (window.handleAndroidBackButton) { window.handleAndroidBackButton(); } else { window.history.back(); }",
                null
            );
            return true;
        }
        
        return super.onKeyDown(keyCode, event);
    }
    
    // JavaScript interface sınıfı
    public class WebAppInterface {
        @JavascriptInterface
        public void exitApp() {
            finish();
        }
        
        @JavascriptInterface
        public void goBack() {
            WebView webView = getBridge().getWebView();
            if (webView.canGoBack()) {
                webView.goBack();
            } else {
                finish();
            }
        }
    }
}
