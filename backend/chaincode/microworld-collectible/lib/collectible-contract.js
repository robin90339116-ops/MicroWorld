'use strict';

const { Contract } = require('fabric-contract-api');

// MicroWorld 数字藏品链码。
//
// 面向华为云 BCS(Hyperledger Fabric 联盟链)。用于把「碰一碰相遇藏品」「地标奖牌」等
// 藏品发行上链,提供可验证、防篡改的凭证。
//
// 合规取向(中国数字藏品):
// - 仅发行 + 查询,不提供公开的二级转让/交易接口(避免炒作)。
// - 每个 tokenId 唯一,由后端保证语义(如 SW-LIBRARY-READER-00001)。
class CollectibleContract extends Contract {
  constructor() {
    super('CollectibleContract');
  }

  _key(ctx, tokenId) {
    return ctx.stub.createCompositeKey('collectible', [tokenId]);
  }

  async _exists(ctx, tokenId) {
    const key = this._key(ctx, tokenId);
    const bytes = await ctx.stub.getState(key);
    return bytes && bytes.length > 0;
  }

  // 铸造一个藏品。
  // args: tokenId, owner, metadataJson
  async MintCollectible(ctx, tokenId, owner, metadataJson) {
    if (!tokenId || !owner) {
      throw new Error('tokenId 与 owner 必填');
    }
    if (await this._exists(ctx, tokenId)) {
      throw new Error(`藏品已存在: ${tokenId}`);
    }

    let metadata = {};
    if (metadataJson) {
      try {
        metadata = JSON.parse(metadataJson);
      } catch (error) {
        throw new Error(`metadata 不是合法 JSON: ${error.message}`);
      }
    }

    const txId = ctx.stub.getTxID();
    const timestamp = ctx.stub.getTxTimestamp();
    const issuedAt = new Date(Number(timestamp.seconds) * 1000).toISOString();

    const record = {
      docType: 'collectible',
      tokenId,
      owner,
      standard: 'SmallWorld Landmark Collectible v1',
      metadata,
      mintTxId: txId,
      issuedAt,
      transferable: false
    };

    await ctx.stub.putState(this._key(ctx, tokenId), Buffer.from(JSON.stringify(record)));
    ctx.stub.setEvent('CollectibleMinted', Buffer.from(JSON.stringify({ tokenId, owner, mintTxId: txId })));

    // 返回给后端锚定层的字段(txHash = 交易 ID)。
    return JSON.stringify({ tokenId, owner, txHash: txId, issuedAt });
  }

  // 查询单个藏品。
  async QueryCollectible(ctx, tokenId) {
    const bytes = await ctx.stub.getState(this._key(ctx, tokenId));
    if (!bytes || bytes.length === 0) {
      throw new Error(`藏品不存在: ${tokenId}`);
    }
    return bytes.toString();
  }

  async CollectibleExists(ctx, tokenId) {
    return (await this._exists(ctx, tokenId)).toString();
  }

  // 列出某个持有者的全部藏品。
  async ListByOwner(ctx, owner) {
    const iterator = await ctx.stub.getStateByPartialCompositeKey('collectible', []);
    const results = [];
    for (let res = await iterator.next(); !res.done; res = await iterator.next()) {
      try {
        const record = JSON.parse(res.value.value.toString());
        if (record.owner === owner) {
          results.push(record);
        }
      } catch (error) {
        // 跳过无法解析的记录
      }
    }
    await iterator.close();
    return JSON.stringify(results);
  }
}

module.exports = CollectibleContract;
