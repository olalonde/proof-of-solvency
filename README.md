WORK IN PROGRESS. See [olalonde/blind-liability-proof](https://github.com/olalonde/blind-liability-proof)

# blind-solvency-proof

This is a scheme that describes how Bitcoin shared wallet operators can prove
they are solvent in a way that protects the privacy of its users.

## Liabilities proof

The liability proof is done using the scheme described at
[olalonde/blind-liability-proof](https://github.com/olalonde/blind-liability-proof).

Embedded:

```
<meta name="x-liabilities-proof" data="/account/btc-partial-tree.json">
```

/acccount/btc-partial-tree.json (different for each user)

```
{
  "id": "MtGox.com BTC liabilities"
  "partial_tree": { ... }
}
```

## Assets proof

Embedded:

```
<meta name='x-assets-proof' data='/btc-assets.json'>
```

/btc-assets.json
```
{
  "id": "MtGox.com BTC assets"
  signatures: [
    { address: "", signature: "" }
  ],
  type: "BTC" (optional - defaults to bitcoin)
}
```

## Solvency proof

[Blind Solvency Verifier](https://github.com/olalonde/blind-solvency-verifier-extension) Chrome Extension

The proof that a site is solvent can be done by adding up all amounts
controlled by addresses listed in the assets proof and deducting this
amount from the root value in the liabilities proof.

```
function is_solvent() { return (assets >= liabilities) }
```

Assets and liabilities proof should be paired together using the `id` key. An asset
proof must have the same `id` as its matching liabilities proof. This
allows a shared wallet who handles multiple currencies to have multiple
solvency proofs.
