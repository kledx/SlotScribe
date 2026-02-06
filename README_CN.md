# SlotScribe 鈥?Solana AI Agent 鍙獙璇侀粦鐩掞紙Execution Flight Recorder锛?
> 璁?Solana 涓婄殑 AI Agent 浠庘€滀俊浠绘垜鈥濆彉鎴愨€滀綘鍙互楠岃瘉鎴戔€濄€?
SlotScribe 鏄竴涓?**鍙獙璇佺殑鎵ц璁板綍鍣紙Execution Recorder锛?*锛? 
- Agent **鐓у父**鏋勫缓/绛惧悕/鍙戦€佷氦鏄擄紙SlotScribe 涓嶆墭绠＄閽ャ€佷笉鏇夸綘绛惧悕锛夈€? 
- SlotScribe 鍦ㄩ摼涓嬭褰?trace锛堟剰鍥俱€佽鍒掋€佸伐鍏疯皟鐢ㄣ€佷氦鏄撴憳瑕佺瓑锛夛紝瀵?**trace.payload** 鍋?JSON 瑙勮寖鍖栧悗璁＄畻 **SHA-256**銆? 
- 灏嗚 hash 鍐欏叆鍚屼竴绗斾氦鏄撶殑 **Memo** 鎸囦护锛堥摼涓婇敋瀹氾級銆? 
- 浠讳綍浜哄彧瑕佹彁渚?tx signature锛屽氨鑳藉湪 Viewer/CLI 涓绠?hash 骞堕獙璇侊細  
  鉁?**on-chain Memo hash == trace payload hash**

---

## 馃 AI Agent 鐢熸€佸吋瀹?
SlotScribe 涓虹幇浠?AI Agent 鎻愪緵澶氱闆嗘垚鏂瑰紡锛?- **[MCP 鏈嶅姟鍣╙(./docs/MCP_Quick_Start.md)**: 鍘熺敓鏀寔 Model Context Protocol锛岄€傞厤 Claude Desktop 鍙婂悇绫?MCP Agent銆?- **[1 琛?SDK 鎻掍欢](./docs/AI_Agent_Quick_Start.md)**: 涓?TypeScript/Node.js Agent 鎻愪緵鏋佺畝闆嗘垚銆?- **[鍏叡 API](https://slotscribe.xyz/api/trace)**: 涓轰换浣曡瑷€锛圥ython, Rust 绛夛級缂栧啓鐨?Agent 鎻愪緵 REST API銆?
---

## 涓轰粈涔堥渶瑕?SlotScribe锛?
褰?AI Agent 寮€濮嬪弬涓?DeFi銆佽川鎶笺€佷氦鏄撱€佷换鍔″競鍦烘椂锛屾渶澶х殑椋庨櫓涓嶆槸鈥滆兘涓嶈兘鍋氣€濓紝鑰屾槸锛?- 瀹冨埌搴曞仛浜嗕粈涔堬紵
- 鏈夋病鏈変簨鍚庢敼鍙ｏ紵
- 鍑洪棶棰樻椂濡備綍澶嶇洏涓庨棶璐ｏ紵

SlotScribe 鎻愪緵涓€涓畝鍗曚絾寮哄ぇ鐨勫熀纭€璁炬柦锛?*鍙獙璇佺殑鎵ц鏀舵嵁锛坴erifiable execution receipt锛?*銆?
---

## SlotScribe 濡備綍鈥滈獙璇?agent 琛屼负鈥濓紵锛堜綘鍙互鐩存帴寮曠敤锛?
### 1) 鎶娾€滆涓衡€濅粠鍙ｅご澹版槑鍙樻垚鍙牳瀵圭殑璇佹嵁

娌℃湁 SlotScribe 鏃讹紝agent 鍙互璇达細

> 鈥滄垜甯綘涔颁簡 meme 甯侊紝鏀惧績銆傗€?
鏈?SlotScribe 鏃讹紝agent 蹇呴』缁欏嚭锛?- tx signature
- 鍙獙璇佹姤鍛婏紙鉁?Verified锛?
鐢ㄦ埛/鍙︿竴涓?agent 鍙互鐙珛鏍稿锛?- 鐪熺殑涔颁簡鍚楋紵涔颁簡鍝釜 token锛熻姳浜嗗灏戯紵缁撴灉濡備綍锛?- 鏈夋病鏈夊す甯﹀埆鐨勬寚浠わ紙渚嬪杞蛋璧勪骇锛夛紵

杩欏氨鏄涓洪獙璇侊細浠庘€滄垜璇存垜鍋氫簡鈥濆彉鎴愨€滈摼涓婅瘉鎹樉绀烘垜鍋氫簡鈥濄€?
### 2) 璁┾€滀俊浠婚棬妲涒€濊嚜鍔ㄥ寲锛堣鍒殑 agent 鍋氬垽鏂級

杩欐墠鏄?SlotScribe 鐪熸鐨勬墿鏁ｇ偣锛?- 浠诲姟甯傚満/璧勯噾鏂?绛栫暐璺熷崟 agent 鍙互璁捐鍒欙細  
  - `if not SlotScribe verified -> refuse / require manual review`
- 缁撶畻鍙互缁戝畾锛? 
  - 鈥滃彧鏈?Verified 鐨?tx 鎵嶄粯娆?鍒嗘垚鈥?
---

## 鏍稿績鍘熺悊锛堟渶閲嶈锛?
### Hash 瑙勫垯
- `payloadHash = sha256Hex(canonicalize(trace.payload))`
- Memo 鍐呭蹇呴』鍖呭惈锛歚SS1 payload=<payloadHash>`

### 楠岃瘉娴佺▼
1. RPC 鎷夊彇浜ゆ槗锛岃В鏋?Memo 寰楀埌 `payloadHashOnChain`
2. 璇诲彇 `trace.json`
3. 閲嶆柊璁＄畻 `payloadHashLocal`
4. 姣旇緝锛歚payloadHashOnChain === payloadHashLocal` 鈫?鉁?Verified

> 娉ㄦ剰锛歚trace` 鍙寘鍚?`onChain` 绛夊瓧娈碉紝浣?*涓嶅弬涓?hash**銆傚弬涓?hash 鐨勫彧鏈?`trace.payload`銆?
---

## 蹇€熷紑濮嬶紙鏈湴 Demo锛?
### 渚濊禆
- Node.js >= 20
- pnpm

### 瀹夎
```bash
pnpm install
```

### 涓€閿窇閫?Demo锛坉evnet锛?```bash
pnpm demo
```

浣犲皢鐪嬪埌绫讳技杈撳嚭锛?- `Signature: <tx_signature>`
- `PayloadHash: <sha256_hex>`
- `Viewer: http://localhost:3000/verify?cluster=devnet&sig=<tx_signature>&hash=<sha256_hex>`

鎵撳紑 Viewer 閾炬帴鍚庡簲鏄剧ず锛?- 鉁?Verified锛圡emo hash 涓?trace payload hash 鍖归厤锛?- 浜ゆ槗鎽樿锛坱o / lamports / fee / programs锛?- trace 鏃堕棿绾匡紙intent / plan / tool calls / send锛?
> Demo 浼氬湪 devnet 鐢ㄤ复鏃?Keypair airdrop 璧勯噾锛岀劧鍚庡彂閫佷竴绗斿甫 Memo 鐨勮浆璐︿氦鏄撱€?
---

## CLI 楠岃瘉

```bash
pnpm verify -- --cluster devnet --sig <tx_signature>
```

鍙€夊弬鏁帮細
- `--hash <payloadHash>`锛堜笉浼犲垯浠?Memo 瑙ｆ瀽锛?- `--rpc <rpcUrl>`
- `--trace <path>`锛堟寚瀹?trace 鏂囦欢璺緞锛?
---

## Viewer锛堥獙璇侀〉闈級

鏈湴鍚姩锛?```bash
pnpm dev
```

椤甸潰锛?- 棣栭〉锛歚http://localhost:3000/`
- 楠岃瘉椤碉細`http://localhost:3000/verify`

楠岃瘉椤垫敮鎸侊細
- 杈撳叆 tx signature
- 閫夋嫨 cluster锛坉evnet/mainnet-beta/testnet锛?- 杈撳嚭 鉁?鉂?涓?mismatch 鍘熷洜锛坮easons锛?
---

## 1 琛岄泦鎴愶紙鑷姩璁板綍鎻掍欢锛?
SlotScribe 鎻愪緵 **鑷姩璁板綍鎻掍欢**锛岃鍏朵粬鍥㈤槦鍑犱箮涓嶇敤鏀逛笟鍔￠€昏緫灏辫兘鎺ュ叆銆?
### 鏂瑰紡 A锛氬寘涓€灞?Connection锛堟帹鑽愶級
```ts
import { Connection } from "@solana/web3.js";
import { withSlotScribe } from "slotscribe";

const connection = withSlotScribe(new Connection(rpcUrl, "confirmed"), {
  cluster: "devnet",
  autoUpload: true,
  baseUrl: "http://localhost:3000"
});

// 鐩存帴娌跨敤鏍囧噯 API锛?const signature = await connection.sendTransaction(tx, [payer]);
```

### 鏂瑰紡 B锛氬寘涓€灞?Signer锛坆est-effort锛?閫傜敤浜庢煇浜涘彧鏆撮湶 signer 鐨勬鏋躲€傛敞鎰?signer 涓嶈礋璐ｅ箍鎾紝鎵€浠ユ洿閫傚悎鍋氣€滈鎻愪氦 trace鈥濄€?
---

## 鎻掍欢 Demo
```bash
pnpm examples
```

---

## Trace 瀛樺偍

SlotScribe 榛樿浣跨敤鍐呭瀵诲潃锛坈ontent-addressable锛夋柟寮忥細  
- 鏂囦欢锛歚data/traces/<payloadHash>.json`锛坔ackathon 鏈€蹇級
- HTTP锛歚POST/GET /api/trace/<hash>`锛堟帹鑽愰儴缃插悗缁欑敓鎬佷娇鐢級
- 鍚庣画鍙墿灞曞埌 S3/R2銆両PFS/Arweave 绛?
---

## 鍏叡 API锛堜緵鍏朵粬 Agent 浣跨敤锛?
SlotScribe 鍦?`https://slotscribe.xyz` 鎻愪緵**鍏叡 API**锛屽叾浠?Agent 鍙互鐩存帴涓婁紶鍜屾煡璇?trace銆?
### 涓婁紶 trace
```bash
POST https://slotscribe.xyz/api/trace
Content-Type: application/json

{
  "version": "BBX1",
  "payload": { ... },
  "payloadHash": "<sha256_hex>",
  ...
}
```

### 鏌ヨ trace
```bash
GET https://slotscribe.xyz/api/trace/<payloadHash>
```

### SDK 杈呭姪鍑芥暟
```typescript
import { SlotScribeRecorder, uploadTrace, buildMemoIx } from 'slotscribe';

// ... 浜ゆ槗纭鍚?...
const trace = recorder.buildTrace();
const result = await uploadTrace(trace, {
    baseUrl: 'https://slotscribe.xyz'
});

console.log('楠岃瘉椤甸潰:', result.viewerUrl);
// 鈫?https://slotscribe.xyz/verify?sig=xxx&hash=xxx
```

### API 鐗规€?- 鉁?鏀寔 CORS锛堜换浣曞煙鍚嶉兘鍙皟鐢級
- 鉁?Hash 楠岃瘉锛堥噸鏂拌绠楀苟鏍￠獙锛?- 鉁?闃查噸澶嶄笂浼狅紙鐩稿悓 hash 涓嶄細瑕嗙洊锛?
---

## 鐩綍缁撴瀯

```
src/slotscribe/      # 鏍稿績 SDK锛坱race銆乧anonicalize銆乭ash銆乺ecorder銆乻olana helpers锛?src/plugins/         # 鑷姩璁板綍鎻掍欢锛? 琛岄泦鎴愶級
scripts/             # demo / verify CLI
app/                 # Next.js Viewer锛坴erify 椤甸潰 + trace API锛?lib/                 # trace store / verifier
data/traces/         # 鏈湴 trace 瀛樺偍锛堥粯璁わ級
```

---

## 瀹夊叏涓庤竟鐣?
- SlotScribe **涓嶆墭绠＄閽?*銆佷笉鏇夸綘绛惧悕銆佷笉鏀瑰彉浜ゆ槗璇箟锛堝彧杩藉姞 Memo 鎸囦护锛夈€?- SlotScribe 楠岃瘉鐨勬槸锛?*閾句笂 memo hash 涓?trace payload 涓€鑷?*銆? 
  瀹冧笉鐩存帴璇佹槑鈥滈摼涓嬪伐鍏疯緭鍑烘槸鐪熷疄鐨勨€濓紝浣嗚兘淇濊瘉璁板綍**涓嶅彲浜嬪悗绡℃敼**銆?- 寤鸿鍦ㄧ敓浜у満鏅彔鍔犫€淧olicy Gate鈥濓紙闄愰銆乤llowlist銆佹粦鐐归檺鍒剁瓑锛夊仛浜嬪墠闃叉姢銆?
---

## Roadmap锛堝缓璁級

- [ ] 澶氫氦鏄?session锛堜竴涓?intent 鈫?澶氱瑪 tx 鐨勭粺涓€鏃堕棿绾匡級
- [ ] DeFi 瑙ｆ瀽鎻掍欢锛圝upiter swap / staking / token delta锛?- [x] MCP 鏀寔锛氭彁渚涗氦浜掑紡 Agent 鐨?slotscribe-mcp 鏈嶅姟鍣?- [ ] Commit鈥揜eveal锛堟洿寮虹殑涓嶅彲鎶佃禆锛氶槻浜嬪悗鏀瑰彛锛?
---

## License
MIT

