# ember

`ember/` では、Mutable Instruments の各 Eurorack モジュールを tscircuit で順次再実装する。

## 作業方針

- 回路・基板は TypeScript / React ベースの tscircuit で実装する
- モジュール固有の実装だけでなく、再利用可能な Eurorack 共通プリミティブと回路ブロックを `ember/` に蓄積する
- 新しいモジュールの実装や関連ツールは `ember/` 配下に追加する
- `ember/README.md` に記載された構成・開発手順に従う

## Imported Claude Cowork project instructions
