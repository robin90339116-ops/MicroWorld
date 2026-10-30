import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit';
import { display, window } from '@kit.ArkUI';
import bundleManager from '@ohos.bundle.bundleManager';

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    AppStorage.setOrCreate('appName', 'MicroWorld');
    this.logAmapAppId();
  }

  private logAmapAppId(): void {
    try {
      const flag = bundleManager.BundleFlag.GET_BUNDLE_INFO_WITH_SIGNATURE_INFO;
      const bundleInfo = bundleManager.getBundleInfoForSelfSync(flag);
      const appId = bundleInfo.signatureInfo.appId;
      AppStorage.setOrCreate('amapAppId', appId);
      console.info('[MicroWorld] 高德地图 AppID: ' + appId);
    } catch (error) {
      console.error('[MicroWorld] 获取高德地图 AppID 失败: ' + JSON.stringify(error));
    }
  }

  // 把系统避让区(状态栏、刘海/挖孔、底部手势条)换算成 vp 写入 AppStorage,页面用 @StorageProp 读取。
  // 横竖屏切换、折叠屏开合时 avoidAreaChange / windowSizeChange 会再次触发,数值随之更新。
  private publishSafeArea(win: window.Window): void {
    try {
      const density = display.getDefaultDisplaySync().densityPixels || 1;
      const rect = win.getWindowProperties().windowRect;
      const sys = win.getWindowAvoidArea(window.AvoidAreaType.TYPE_SYSTEM);
      const cut = win.getWindowAvoidArea(window.AvoidAreaType.TYPE_CUTOUT);
      const nav = win.getWindowAvoidArea(window.AvoidAreaType.TYPE_NAVIGATION_INDICATOR);
      const topOf = (a: window.AvoidArea): number => a.topRect.height > 0 ? a.topRect.top + a.topRect.height : 0;
      const bottomOf = (a: window.AvoidArea): number => a.bottomRect.height > 0 ? rect.height - a.bottomRect.top : 0;
      const leftOf = (a: window.AvoidArea): number => a.leftRect.width > 0 ? a.leftRect.left + a.leftRect.width : 0;
      const rightOf = (a: window.AvoidArea): number => a.rightRect.width > 0 ? rect.width - a.rightRect.left : 0;
      const top = Math.max(topOf(sys), topOf(cut));
      const bottom = Math.max(bottomOf(sys), bottomOf(nav), bottomOf(cut));
      const left = Math.max(leftOf(sys), leftOf(cut));
      const right = Math.max(rightOf(sys), rightOf(cut));
      AppStorage.setOrCreate<number>('safeTop', Math.max(0, top / density));
      AppStorage.setOrCreate<number>('safeBottom', Math.max(0, bottom / density));
      AppStorage.setOrCreate<number>('safeLeft', Math.max(0, left / density));
      AppStorage.setOrCreate<number>('safeRight', Math.max(0, right / density));
      console.info('[MicroWorld] safeArea vp top=' + (top / density) + ' bottom=' + (bottom / density) +
        ' left=' + (left / density) + ' right=' + (right / density));
    } catch (error) {
      console.error('[MicroWorld] 读取系统避让区失败: ' + JSON.stringify(error));
    }
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    try {
      const mainWindow = windowStage.getMainWindowSync();
      // 沉浸式:窗口铺满全屏,系统状态栏/手势条保持显示但透明,由页面按真实避让区自行留白。
      // 不再隐藏状态栏,也不再写死状态栏高度——不同机型(刘海、挖孔、折叠屏、平板)的避让区差异很大。
      mainWindow.setWindowLayoutFullScreen(true);
      this.publishSafeArea(mainWindow);
      mainWindow.on('avoidAreaChange', () => { this.publishSafeArea(mainWindow); });
      mainWindow.on('windowSizeChange', () => { this.publishSafeArea(mainWindow); });
      mainWindow.setWindowSystemBarProperties({
        statusBarColor: '#00000000',
        navigationBarColor: '#00000000',
        statusBarContentColor: '#23271F',
        navigationBarContentColor: '#23271F'
      });
    } catch (error) {
      console.error('[MicroWorld] 设置全屏窗口失败: ' + JSON.stringify(error));
    }
    try {
      windowStage.loadContent('pages/Index');
    } catch (error) {
      console.error('[MicroWorld] 加载首页失败: ' + JSON.stringify(error));
    }
  }
}
