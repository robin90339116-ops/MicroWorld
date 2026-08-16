'use strict';

// 可插拔「数字藏品上链/铸造」层。
//
// 目标:把藏品(碰一碰相遇藏品、地标奖牌等)从「后端自签数字藏品凭证」平滑升级到
// 「华为云 BCS 联盟链上链藏品」,而业务代码只对接这一个抽象。
//
// - certificate(默认):不接任何链,维持现状——后端自发 tokenId、chainStatus=digital-certificate。
//   这是「暂不接真链」阶段的默认行为,smoke 与线上表现完全不变。
// - huawei-bcs:面向华为云 BCS(联盟链 / Hyperledger Fabric)。stampNewCollectible 先把状态标为
//   pending-mint,真正铸造走异步 mint()(调用链码 MintCollectible)。需配置 BCS 网关端点与身份证书后启用。
//
// 由 SMALLWORLD_CHAIN_PROVIDER 选择驱动(默认 certificate)。未启用 huawei-bcs 时,
// 不会发起任何链上调用,也不需要任何链相关依赖或凭证。

const http = require('http');
const https = require('https');
const { URL } = require('url');

const COLLECTIBLE_STANDARD = 'SmallWorld Landmark Collectible v1';

// ---------------------------------------------------------------------------
// certificate 驱动(默认,不上链)
// ---------------------------------------------------------------------------
function createCertificateAnchor() {
  return {
    provider: 'certificate',
    onChainEnabled: false,
    standard: COLLECTIBLE_STANDARD,

    // 生成藏品记录时同步打上链相关字段。certificate 模式即现状。
    stampNewCollectible(record) {
      record.chainProvider = 'certificate';
      record.chainStatus = 'digital-certificate';
      record.txHash = '';
      record.chainName = '';
      return record;
    },

    // certificate 模式没有真实链上铸造。
    async mint() {
      return { onChain: false, chainStatus: 'digital-certificate', txHash: '', chainName: '' };
    },

    async close() {}
  };
}

// ---------------------------------------------------------------------------
// huawei-bcs 驱动(华为云 BCS 联盟链 / Fabric 链码)
// ---------------------------------------------------------------------------
function createHuaweiBcsAnchor() {
  // 配置项(启用时才需要):
  // - SMALLWORLD_CHAIN_ENDPOINT : BCS 链码调用网关地址(REST invoke 接口)
  // - SMALLWORLD_CHAIN_CHANNEL   : 通道名
  // - SMALLWORLD_CHAIN_CODE      : 链码名(默认 microworld-collectible)
  // - SMALLWORLD_CHAIN_NAME      : 展示用链名(默认 huawei-bcs)
  // - SMALLWORLD_CHAIN_API_KEY   : 网关鉴权(如需要)
  const config = {
    endpoint: String(process.env.SMALLWORLD_CHAIN_ENDPOINT || '').trim(),
    channel: String(process.env.SMALLWORLD_CHAIN_CHANNEL || 'microworld-channel').trim(),
    chaincode: String(process.env.SMALLWORLD_CHAIN_CODE || 'microworld-collectible').trim(),
    chainName: String(process.env.SMALLWORLD_CHAIN_NAME || 'huawei-bcs').trim(),
    apiKey: String(process.env.SMALLWORLD_CHAIN_API_KEY || '').trim()
  };
  const configured = config.endpoint.length > 0;

  // 通用链码调用:向 BCS 网关 POST { channel, chaincode, function, args }。
  // 注意:BCS 既可用 Fabric SDK,也可用 REST 网关。此处按 REST 网关约定实现;
  // 若你的 BCS 用 SDK 或字段不同,替换这一个方法即可,上层无需改动。
  function invokeChaincode(fn, args, mode) {
    return new Promise((resolve, reject) => {
      if (!configured) {
        reject(new Error('huawei-bcs 未配置 SMALLWORLD_CHAIN_ENDPOINT,无法上链'));
        return;
      }
      let target;
      try {
        target = new URL(config.endpoint);
      } catch (error) {
        reject(new Error(`SMALLWORLD_CHAIN_ENDPOINT 不是合法 URL: ${error.message}`));
        return;
      }
      const payload = JSON.stringify({
        channel: config.channel,
        chaincode: config.chaincode,
        function: fn,
        args,
        mode: mode || 'invoke'
      });
      const headers = { 'Content-Type': 'application/json' };
      if (config.apiKey.length > 0) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }
      const client = target.protocol === 'https:' ? https : http;
      const request = client.request(
        target,
        { method: 'POST', headers, timeout: 15000 },
        response => {
          let body = '';
          response.on('data', chunk => { body += chunk; });
          response.on('end', () => {
            if ((response.statusCode || 500) >= 400) {
              reject(new Error(`BCS 链码调用失败(${response.statusCode}): ${body}`));
              return;
            }
            try {
              resolve(body ? JSON.parse(body) : {});
            } catch (error) {
              reject(new Error(`BCS 响应解析失败: ${error.message}`));
            }
          });
        }
      );
      request.on('timeout', () => request.destroy(new Error('BCS 链码调用超时')));
      request.on('error', reject);
      request.write(payload);
      request.end();
    });
  }

  return {
    provider: 'huawei-bcs',
    onChainEnabled: configured,
    standard: COLLECTIBLE_STANDARD,
    config,

    // 铸造前先把记录标为待上链;真实铸造由异步 mint() 完成。
    stampNewCollectible(record) {
      record.chainProvider = 'huawei-bcs';
      record.chainStatus = configured ? 'pending-mint' : 'digital-certificate';
      record.txHash = '';
      record.chainName = config.chainName;
      return record;
    },

    // 调用链码把藏品铸造上链。返回 { onChain, chainStatus, tokenId, txHash, chainName }。
    async mint(input) {
      const result = await invokeChaincode('MintCollectible', [
        input.tokenId,
        input.owner,
        JSON.stringify(input.metadata || {})
      ]);
      return {
        onChain: true,
        chainStatus: 'on-chain',
        tokenId: result.tokenId || input.tokenId,
        txHash: result.txHash || result.transactionId || '',
        chainName: config.chainName
      };
    },

    async query(tokenId) {
      return invokeChaincode('QueryCollectible', [tokenId], 'query');
    },

    async close() {}
  };
}

// ---------------------------------------------------------------------------
// 工厂
// ---------------------------------------------------------------------------
function createChainAnchor() {
  const provider = String(process.env.SMALLWORLD_CHAIN_PROVIDER || 'certificate').trim().toLowerCase();
  if (provider === 'huawei-bcs' || provider === 'bcs') {
    return createHuaweiBcsAnchor();
  }
  return createCertificateAnchor();
}

module.exports = { createChainAnchor, createCertificateAnchor, createHuaweiBcsAnchor, COLLECTIBLE_STANDARD };
