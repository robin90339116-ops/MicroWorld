import { MapsInitializer, MapView, MapViewComponent, MapViewManager, AMap, CameraUpdateFactory, LatLng, MarkerOptions, BitmapDescriptorFactory } from '@amap/amap_lbs_map3d';
import { AMapLocationManagerImpl, AMapLocationOption, AMapLocationType, IAMapLocationListener, AMapLocation } from '@amap/amap_lbs_location';
import { AMapPrivacyShowStatus, AMapPrivacyInfoStatus, AMapPrivacyAgreeStatus } from '@amap/amap_lbs_common';
import common from '@ohos.app.ability.common';

interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

// 高德地图 API Key，需与当前签名 AppID 匹配。
const AMAP_API_KEY = '4879c36122467ab4106d7592f0b13516';

/**
 * 高德地图管理类
 * 负责地图初始化、定位、标记点管理
 */
export class AMapManager {
  private static instance: AMapManager;
  private context: common.UIAbilityContext | null = null;
  private aMap: AMap | null = null;
  private mapView: MapView | null = null;
  private locationManager: AMapLocationManagerImpl | null = null;
  private isInitialized: boolean = false;

  // 当前位置
  private currentLatitude: number = -37.8136; // 默认墨尔本
  private currentLongitude: number = 144.9637;

  private constructor() {}

  public static getInstance(): AMapManager {
    if (!AMapManager.instance) {
      AMapManager.instance = new AMapManager();
    }
    return AMapManager.instance;
  }

  /**
   * 初始化高德地图SDK
   */
  public init(context: common.UIAbilityContext): void {
    if (this.isInitialized) {
      return;
    }
    this.context = context;

    // 设置API Key
    MapsInitializer.setApiKey(AMAP_API_KEY);
    MapsInitializer.setDebugMode(true);
    AMapLocationManagerImpl.setApiKey(AMAP_API_KEY);

    // 地图和定位 SDK 都需要分别提交隐私展示与同意状态。
    MapsInitializer.updatePrivacyShow(
      AMapPrivacyShowStatus.DidShow,
      AMapPrivacyInfoStatus.DidContain,
      context
    );
    MapsInitializer.updatePrivacyAgree(AMapPrivacyAgreeStatus.DidAgree, context);
    AMapLocationManagerImpl.updatePrivacyShow(
      AMapPrivacyShowStatus.DidShow,
      AMapPrivacyInfoStatus.DidContain,
      context
    );
    AMapLocationManagerImpl.updatePrivacyAgree(AMapPrivacyAgreeStatus.DidAgree, context);

    // 初始化定位管理器
    this.locationManager = new AMapLocationManagerImpl(context);

    this.isInitialized = true;
  }

  /**
   * 注册MapView创建回调
   */
  public registerMapViewCallback(callback: (mapView?: MapView, mapViewName?: string) => void): void {
    MapViewManager.getInstance().registerMapViewCreatedCallback(callback);
  }

  /**
   * 注销MapView创建回调
   */
  public unregisterMapViewCallback(callback: (mapView?: MapView, mapViewName?: string) => void): void {
    MapViewManager.getInstance().unregisterMapViewCreatedCallback(callback);
  }

  /**
   * 设置AMap对象
   */
  public setAMap(aMap: AMap): void {
    this.aMap = aMap;
  }

  /**
   * 获取AMap对象
   */
  public getAMap(): AMap | null {
    return this.aMap;
  }

  /**
   * 设置MapView对象
   */
  public setMapView(mapView: MapView): void {
    this.mapView = mapView;
  }

  /**
   * 移动地图到指定位置
   */
  public moveToLocation(latitude: number, longitude: number, zoom: number = 15): void {
    if (this.aMap) {
      this.aMap.moveCamera(CameraUpdateFactory.newLatLngZoom(new LatLng(latitude, longitude), zoom));
    }
  }

  /**
   * 添加标记点
   */
  public addMarker(latitude: number, longitude: number, title: string, iconPath?: string): void {
    if (!this.aMap || !this.context) {
      return;
    }

    const markerOptions = new MarkerOptions()
      .setPosition(new LatLng(latitude, longitude))
      .setTitle(title);

    if (iconPath) {
      const icon = BitmapDescriptorFactory.fromRawfilePathSync(this.context, iconPath);
      if (icon) {
        markerOptions.setIcon(icon);
      }
    }

    this.aMap.addMarker(markerOptions);
  }

  /**
   * 清除所有标记点
   */
  public clearMarkers(): void {
    if (this.aMap) {
      this.aMap.clear();
    }
  }

  /**
   * 开始定位
   */
  public startLocation(listener: IAMapLocationListener): void {
    if (!this.locationManager) {
      return;
    }

    const options: AMapLocationOption = {
      priority: 1, // FIRST_FIX
      timeInterval: 2000,
      distanceInterval: 0,
      locatingWithReGeocode: true,
      isOffset: true
    };

    this.locationManager.setLocationOption(AMapLocationType.Updating, options);
    this.locationManager.setLocationListener(AMapLocationType.Updating, listener);
    this.locationManager.startUpdatingLocation();
  }

  /**
   * 停止定位
   */
  public stopLocation(): void {
    if (this.locationManager) {
      this.locationManager.stopUpdatingLocation();
    }
  }

  /**
   * 获取当前位置
   */
  public getCurrentLocation(): GeoCoordinate {
    const currentLocation: GeoCoordinate = {
      latitude: this.currentLatitude,
      longitude: this.currentLongitude
    };
    return currentLocation;
  }

  /**
   * 更新当前位置
   */
  public updateCurrentLocation(latitude: number, longitude: number): void {
    this.currentLatitude = latitude;
    this.currentLongitude = longitude;
  }

  /**
   * 销毁地图
   */
  public destroy(): void {
    if (this.mapView) {
      this.mapView.onDestroy();
      this.mapView = null;
    }
    this.aMap = null;
    this.stopLocation();
  }
}

export default AMapManager;
