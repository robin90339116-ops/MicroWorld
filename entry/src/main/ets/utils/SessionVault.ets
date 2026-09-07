import asset from '@ohos.security.asset';
import util from '@ohos.util';
import { BusinessError } from '@kit.BasicServicesKit';

export interface SavedSession {
  token: string;
  expiresAt: string;
  baseUrl: string;
}

export interface SavedNfcSession {
  ownerUserId: string;
  baseUrl: string;
  sessionId: string;
  role: string;
  stage: string;
  placeId: string;
  expiresAt: string;
  touchToken: string;
  challenge: string;
  hostUserId: string;
}

// Tokens stay in the OS asset store, never in Preferences, logs or backups.
export default class SessionVault {
  private static nfcWrites: Promise<void> = Promise.resolve();
  private static async read(alias: string): Promise<string> {
    const query: asset.AssetMap = new Map();
    query.set(asset.Tag.ALIAS, new util.TextEncoder().encodeInto(alias));
    query.set(asset.Tag.RETURN_TYPE, asset.ReturnType.ALL);
    try {
      const rows = await asset.query(query);
      if (rows.length === 0) return '';
      return new util.TextDecoder().decodeToString(rows[0].get(asset.Tag.SECRET) as Uint8Array);
    } catch (error) {
      if ((error as BusinessError).code === 24000002) return '';
      throw new Error('系统安全存储读取失败：' + (error as BusinessError).code);
    }
  }

  private static async write(alias: string, value: string): Promise<void> {
    const attributes: asset.AssetMap = new Map();
    attributes.set(asset.Tag.ALIAS, new util.TextEncoder().encodeInto(alias));
    attributes.set(asset.Tag.SECRET, new util.TextEncoder().encodeInto(value));
    attributes.set(asset.Tag.ACCESSIBILITY, asset.Accessibility.DEVICE_UNLOCKED);
    attributes.set(asset.Tag.CONFLICT_RESOLUTION, asset.ConflictResolution.OVERWRITE);
    await asset.add(attributes);
  }

  static async deviceId(): Promise<string> {
    const saved = await SessionVault.read('microworld.device.v1');
    if (saved.length > 0) return saved;
    const next = util.generateRandomUUID(true);
    await SessionVault.write('microworld.device.v1', next);
    return next;
  }

  static async load(): Promise<SavedSession | null> {
    const value = await SessionVault.read('microworld.session.v1');
    if (value.length === 0) return null;
    const session = JSON.parse(value) as SavedSession;
    if (typeof session.token !== 'string' || session.token.length === 0 ||
      typeof session.baseUrl !== 'string' || !Number.isFinite(Date.parse(session.expiresAt)) ||
      Date.parse(session.expiresAt) <= Date.now()) {
      await SessionVault.clear();
      return null;
    }
    return session;
  }

  static async save(session: SavedSession): Promise<void> {
    await SessionVault.write('microworld.session.v1', JSON.stringify(session));
  }

  static async loadNfc(ownerUserId: string, baseUrl: string): Promise<SavedNfcSession | null> {
    await SessionVault.nfcWrites;
    const raw = await SessionVault.read('microworld.nfc.v1');
    if (raw.length === 0) return null;
    const saved = JSON.parse(raw) as SavedNfcSession;
    if (saved.ownerUserId !== ownerUserId || saved.baseUrl !== baseUrl) return null;
    if (typeof saved.sessionId !== 'string' || saved.sessionId.length === 0 ||
      (saved.role !== 'host' && saved.role !== 'reader') || typeof saved.challenge !== 'string' ||
      typeof saved.touchToken !== 'string' || !Number.isFinite(Date.parse(saved.expiresAt))) {
      throw new Error('本地碰一碰记录损坏，不能自动恢复');
    }
    // Even after expiry, query the server: it may already have committed a result.
    return saved;
  }

  static saveNfc(saved: SavedNfcSession): Promise<void> {
    const value = JSON.stringify(saved);
    const write = SessionVault.nfcWrites.then(() => SessionVault.write('microworld.nfc.v1', value));
    SessionVault.nfcWrites = write.catch(() => {});
    return write;
  }

  static clearNfc(sessionId: string): Promise<void> {
    const clear = SessionVault.nfcWrites.then(async () => {
      const raw = await SessionVault.read('microworld.nfc.v1');
      if (raw.length === 0 || (JSON.parse(raw) as SavedNfcSession).sessionId !== sessionId) return;
      const query: asset.AssetMap = new Map();
      query.set(asset.Tag.ALIAS, new util.TextEncoder().encodeInto('microworld.nfc.v1'));
      await asset.remove(query);
    });
    SessionVault.nfcWrites = clear.catch(() => {});
    return clear;
  }

  static async clear(): Promise<void> {
    const query: asset.AssetMap = new Map();
    query.set(asset.Tag.ALIAS, new util.TextEncoder().encodeInto('microworld.session.v1'));
    try {
      await asset.remove(query);
    } catch (error) {
      if ((error as BusinessError).code !== 24000002) {
        throw new Error('系统安全存储清除失败：' + (error as BusinessError).code);
      }
    }
  }
}
