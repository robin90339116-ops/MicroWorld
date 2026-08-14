export enum WorldSpatialDisplayMode {
  PHONE_AR = 'phone_ar',
  GLASSES_AR = 'glasses_ar',
  PASSTHROUGH_MR = 'passthrough_mr',
  IMMERSIVE_MR = 'immersive_mr'
}

export enum WorldSpatialAnchorType {
  DEVICE = 'device',
  GEO = 'geo',
  PLANE = 'plane',
  IMAGE = 'image',
  SHARED = 'shared'
}

export interface WorldSpatialVector3 {
  x: number;
  y: number;
  z: number;
}

export interface WorldSpatialRotation {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface WorldSpatialPose {
  position: WorldSpatialVector3;
  rotation: WorldSpatialRotation;
  scale: WorldSpatialVector3;
}

export interface WorldSpatialCapabilities {
  supportedModes: WorldSpatialDisplayMode[];
  supportedAnchorTypes: WorldSpatialAnchorType[];
  supportsPlaneDetection: boolean;
  supportsDepth: boolean;
  supportsOcclusion: boolean;
  supportsSharedAnchors: boolean;
  supportsHandTracking: boolean;
}

export interface WorldSpatialSessionOptions {
  worldId: string;
  placeId: string;
  mode: WorldSpatialDisplayMode;
  requiresOnsiteVerification: boolean;
  preferredAnchorType: WorldSpatialAnchorType;
}

export interface WorldSpatialAsset {
  id: string;
  kind: string;
  resourceUri: string;
  pose: WorldSpatialPose;
  metadata: string;
}

export interface WorldSpatialContent {
  worldId: string;
  version: string;
  assets: WorldSpatialAsset[];
}

export interface WorldSpatialAnchor {
  id: string;
  type: WorldSpatialAnchorType;
  pose: WorldSpatialPose;
  latitude: number;
  longitude: number;
  altitude: number;
}

export interface WorldSpatialSession {
  id: string;
  providerId: string;
  mode: WorldSpatialDisplayMode;
  worldId: string;
  placeId: string;
}

export interface WorldSpatialDisplayListener {
  onAnchorChanged(anchor: WorldSpatialAnchor): void;
  onAssetSelected(assetId: string): void;
  onTrackingChanged(isTracking: boolean, message: string): void;
  onError(code: string, message: string): void;
}

/**
 * 世界模块的厂商无关空间显示接口。
 * 当前仅定义契约，具体 AR/MR SDK 由后续 Adapter 实现。
 */
export interface WorldSpatialDisplayAdapter {
  getProviderId(): string;
  getCapabilities(): Promise<WorldSpatialCapabilities>;
  isAvailable(mode: WorldSpatialDisplayMode): Promise<boolean>;
  startSession(
    options: WorldSpatialSessionOptions,
    listener: WorldSpatialDisplayListener
  ): Promise<WorldSpatialSession>;
  synchronizeWorld(sessionId: string, content: WorldSpatialContent): Promise<void>;
  upsertAnchor(sessionId: string, anchor: WorldSpatialAnchor): Promise<void>;
  removeAnchor(sessionId: string, anchorId: string): Promise<void>;
  endSession(sessionId: string): Promise<void>;
}
