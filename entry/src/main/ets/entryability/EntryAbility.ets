import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit';
import { window } from '@kit.ArkUI';
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

  onWindowStageCreate(windowStage: window.WindowStage): void {
    try {
      const mainWindow = windowStage.getMainWindowSync();
      mainWindow.setWindowLayoutFullScreen(true);
      mainWindow.setWindowSystemBarEnable([]);
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
