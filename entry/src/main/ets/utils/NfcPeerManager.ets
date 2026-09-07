import { BusinessError } from '@kit.BasicServicesKit';
import cardEmulation from '@ohos.nfc.cardEmulation';
import tag from '@ohos.nfc.tag';
import util from '@ohos.util';

export interface NfcElementName {
  bundleName: string;
  moduleName?: string;
  abilityName: string;
}

export interface NfcHostPayload {
  purpose?: string;
  sessionId: string;
  touchToken: string;
  placeId: string;
  hostUserId: string;
  expiresAt: string;
}

export interface NfcPeerPayload {
  purpose?: string;
  sessionId: string;
  touchToken: string;
  placeId: string;
  hostUserId: string;
  expiresAt: string;
  challenge: string;
}

const SMALLWORLD_AID = 'F0534D414C4C574F524C44';
const STATUS_OK: number[] = [0x90, 0x00];
const STATUS_COMMAND_NOT_SUPPORTED: number[] = [0x6D, 0x00];

export default class NfcPeerManager {
  private elementName: NfcElementName;
  private hceService: cardEmulation.HceService | null = null;
  private hostGeneration: number = 0;
  private hostPayload: NfcHostPayload | null = null;
  private readerActive: boolean = false;
  private readerGeneration: number = 0;
  private hostStatus: ((message: string) => void) | null = null;
  private hostExchange: ((challenge: string) => void) | null = null;
  private selectedChallenge: string = '';
  private readerSuccess: ((payload: NfcPeerPayload) => void) | null = null;
  private readerError: ((message: string) => void) | null = null;

  constructor(elementName: NfcElementName) {
    this.elementName = elementName;
  }

  private errorText(error: BusinessError): string {
    if (error && error.message) {
      return error.message;
    }
    return 'NFC 系统调用失败';
  }

  private hexToBytes(value: string): number[] {
    const bytes: number[] = [];
    for (let index = 0; index < value.length; index += 2) {
      bytes.push(parseInt(value.substring(index, index + 2), 16));
    }
    return bytes;
  }

  private bytesToHex(bytes: number[]): string {
    let value = '';
    for (let index = 0; index < bytes.length; index++) {
      value += bytes[index].toString(16).padStart(2, '0');
    }
    return value;
  }

  private stringToBytes(value: string): number[] {
    const bytes: number[] = [];
    for (let index = 0; index < value.length; index++) {
      bytes.push(value.charCodeAt(index) & 0xFF);
    }
    return bytes;
  }

  private bytesToString(bytes: number[]): string {
    let value = '';
    for (let index = 0; index < bytes.length; index++) {
      value += String.fromCharCode(bytes[index]);
    }
    return value;
  }

  private randomChallenge(): number[] {
    return this.hexToBytes(util.generateRandomUUID(true).replace(/-/g, '').slice(0, 24));
  }

  private buildSelectAidApdu(): number[] {
    const aid = this.hexToBytes(SMALLWORLD_AID);
    const apdu: number[] = [0x00, 0xA4, 0x04, 0x00, aid.length];
    for (let index = 0; index < aid.length; index++) {
      apdu.push(aid[index]);
    }
    apdu.push(0x00);
    return apdu;
  }

  private buildReadTokenApdu(challenge: number[]): number[] {
    const apdu: number[] = [0x80, 0xCA, 0x00, 0x00, challenge.length];
    for (let index = 0; index < challenge.length; index++) {
      apdu.push(challenge[index]);
    }
    apdu.push(0x00);
    return apdu;
  }

  private isSelectAid(command: number[]): boolean {
    return command.length >= 5 && command[0] === 0x00 && command[1] === 0xA4 && command[2] === 0x04 &&
      this.bytesToHex(command.slice(5, 5 + command[4])).toUpperCase() === SMALLWORLD_AID;
  }

  private isReadToken(command: number[]): boolean {
    return command.length >= 6 && command[0] === 0x80 && command[1] === 0xCA;
  }

  private isSuccessResponse(response: number[]): boolean {
    return response.length >= 2 && response[response.length - 2] === 0x90 && response[response.length - 1] === 0x00;
  }

  private sendHceResponse(response: number[]): void {
    if (!this.hceService) {
      return;
    }
    this.hceService.transmit(response).catch((error: BusinessError) => {
      if (this.hostStatus) {
        this.hostStatus('发送 NFC 响应失败：' + this.errorText(error));
      }
    });
  }

  private hceCommandCallback = (error: BusinessError, command: number[]): void => {
    if (error) {
      if (this.hostStatus) {
        this.hostStatus('接收 NFC 指令失败：' + this.errorText(error));
      }
      return;
    }

    if (this.isSelectAid(command)) {
      this.sendHceResponse(STATUS_OK);
      if (this.hostStatus) {
        this.hostStatus('已检测到另一部手机，正在建立安全通道');
      }
      return;
    }

    if (!this.isReadToken(command) || !this.hostPayload) {
      this.sendHceResponse(STATUS_COMMAND_NOT_SUPPORTED);
      return;
    }

    const challengeLength = command[4];
    if (challengeLength !== 12 || command.length < 5 + challengeLength ||
      !(Date.parse(this.hostPayload.expiresAt) > Date.now())) {
      this.sendHceResponse(STATUS_COMMAND_NOT_SUPPORTED);
      return;
    }
    const challengeBytes = command.slice(5, 5 + challengeLength);
    const challenge = this.bytesToHex(challengeBytes);
    if (this.selectedChallenge.length > 0 && this.selectedChallenge !== challenge) {
      this.sendHceResponse(STATUS_COMMAND_NOT_SUPPORTED);
      return;
    }
    this.selectedChallenge = challenge;
    const peerPayload: NfcPeerPayload = {
      purpose: this.hostPayload.purpose || 'personal',
      sessionId: this.hostPayload.sessionId,
      touchToken: this.hostPayload.touchToken,
      placeId: this.hostPayload.placeId,
      hostUserId: this.hostPayload.hostUserId,
      expiresAt: this.hostPayload.expiresAt,
      challenge: this.bytesToHex(challengeBytes)
    };
    const response = this.stringToBytes(JSON.stringify(peerPayload));
    response.push(STATUS_OK[0]);
    response.push(STATUS_OK[1]);
    this.sendHceResponse(response);
    if (this.hostExchange) this.hostExchange(peerPayload.challenge);
    if (this.hostStatus) {
      this.hostStatus('近场令牌已交给另一部手机，等待双方确认');
    }
  };

  startHost(payload: NfcHostPayload, status: (message: string) => void, exchanged?: (challenge: string) => void): boolean {
    this.stopReader();
    this.stopHost();
    this.hostPayload = payload;
    this.hostStatus = status;
    this.hostExchange = exchanged || null;

    try {
      if (!cardEmulation.hasHceCapability()) {
        status('这部手机不支持 HCE，不能作为被碰手机');
        return false;
      }
      this.hceService = new cardEmulation.HceService();
      const generation = this.hostGeneration;
      this.hceService.on('hceCmd', (error: BusinessError, command: number[]) => {
        if (generation === this.hostGeneration) this.hceCommandCallback(error, command);
      });
      this.hceService.start(this.elementName, [SMALLWORLD_AID]);
      status('HCE 已启动，请将另一部手机背部靠近');
      return true;
    } catch (error) {
      const hceError = error as BusinessError;
      status('HCE 启动失败：' + this.errorText(hceError));
      this.hceService = null;
      return false;
    }
  }

  stopHost(): void {
    this.hostGeneration += 1;
    this.hostExchange = null;
    this.selectedChallenge = '';
    if (!this.hceService) {
      this.hostPayload = null;
      return;
    }
    try {
      this.hceService.stop(this.elementName);
    } catch (error) {
      const hceError = error as BusinessError;
      console.error('[MicroWorld] HCE stop failed: ' + this.errorText(hceError));
    }
    this.hceService = null;
    this.hostPayload = null;
  }

  private readerModeCallback = (error: BusinessError, tagInfo: tag.TagInfo): void => {
    if (error) {
      if (this.readerError) {
        this.readerError('发现 NFC 设备失败：' + this.errorText(error));
      }
      return;
    }
    this.readPeerPayload(tagInfo);
  };

  private async readPeerPayload(tagInfo: tag.TagInfo): Promise<void> {
    const generation = this.readerGeneration;
    let isoDep: tag.IsoDepTag | null = null;
    try {
      isoDep = tag.getIsoDep(tagInfo);
      isoDep.connect();
      isoDep.setTimeout(4000);

      const selectResponse = await isoDep.transmit(this.buildSelectAidApdu());
      if (!this.isSuccessResponse(selectResponse)) {
        throw new Error('对方不是 MicroWorld 碰一碰设备');
      }

      const challenge = this.randomChallenge();
      const tokenResponse = await isoDep.transmit(this.buildReadTokenApdu(challenge));
      if (!this.isSuccessResponse(tokenResponse)) {
        throw new Error('未收到有效的碰触令牌');
      }

      const payloadBytes = tokenResponse.slice(0, tokenResponse.length - 2);
      const payload = JSON.parse(this.bytesToString(payloadBytes)) as NfcPeerPayload;
      if (payload.challenge !== this.bytesToHex(challenge)) {
        throw new Error('NFC 挑战校验失败');
      }
      if (!(Date.parse(payload.expiresAt) > Date.now())) {
        throw new Error('对方的碰触令牌已经过期');
      }

      if (generation === this.readerGeneration && this.readerActive && this.readerSuccess) {
        this.readerSuccess(payload);
      }
    } catch (error) {
      const readError = error as BusinessError;
      if (generation === this.readerGeneration && this.readerActive && this.readerError) {
        this.readerError('读取失败：' + this.errorText(readError));
      }
    } finally {
      if (isoDep) {
        try {
          isoDep.resetConnection();
        } catch (error) {
          const closeError = error as BusinessError;
          console.error('[MicroWorld] IsoDep close failed: ' + this.errorText(closeError));
        }
      }
    }
  }

  startReader(success: (payload: NfcPeerPayload) => void, failure: (message: string) => void): boolean {
    this.stopHost();
    this.stopReader();
    this.readerSuccess = success;
    this.readerError = failure;

    try {
      tag.on('readerMode', this.elementName, [tag.ISO_DEP], this.readerModeCallback);
      this.readerActive = true;
      return true;
    } catch (error) {
      const readerError = error as BusinessError;
      failure('Reader 模式启动失败：' + this.errorText(readerError));
      return false;
    }
  }

  stopReader(): void {
    this.readerGeneration += 1;
    this.readerSuccess = null;
    this.readerError = null;
    if (!this.readerActive) {
      return;
    }
    try {
      tag.off('readerMode', this.elementName, this.readerModeCallback);
    } catch (error) {
      const readerError = error as BusinessError;
      console.error('[MicroWorld] NFC reader stop failed: ' + this.errorText(readerError));
    }
    this.readerActive = false;
  }

  stop(): void {
    this.stopReader();
    this.stopHost();
  }
}
