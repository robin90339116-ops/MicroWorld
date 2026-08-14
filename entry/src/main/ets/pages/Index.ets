import { webview } from '@kit.ArkWeb';

@Entry
@Component
struct Index {
  private controller: webview.WebviewController = new webview.WebviewController();

  aboutToAppear(): void {
    webview.WebviewController.setWebDebuggingAccess(true);
    try {
      webview.WebviewController.removeAllCache(true);
    } catch (error) {
      console.error(`[MicroWorld] remove web cache failed: ${JSON.stringify(error)}`);
    }
  }

  build() {
    Stack() {
      Web({
        src: $rawfile('smallworld_prototype.html'),
        controller: this.controller
      })
        .width('100%')
        .height('100%')
        .javaScriptAccess(true)
        .domStorageAccess(true)
        .fileAccess(true)
        .imageAccess(true)
        .zoomAccess(false)
        .overviewModeAccess(false)
        .cacheMode(CacheMode.Online)
        .backgroundColor('#f5f3ee')
        .expandSafeArea(
          [SafeAreaType.SYSTEM],
          [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM, SafeAreaEdge.START, SafeAreaEdge.END]
        );
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#f5f3ee')
    .expandSafeArea(
      [SafeAreaType.SYSTEM],
      [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM, SafeAreaEdge.START, SafeAreaEdge.END]
    );
  }
}
