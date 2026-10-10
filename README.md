# tree-sitter-angelscript

An [AngelScript](https://www.angelcode.com/angelscript/) grammar for
[tree-sitter](https://tree-sitter.github.io/): syntax highlighting in
editors, and structure for tools such as [Recall](https://github.com/MaxSensation/Recall),
whose merges understand AngelScript declarations.

It follows the [language reference](https://www.angelcode.com/angelscript/sdk/docs/manual/doc_script.html)
and what the standard add-ons and game engines add:

* namespaces, classes (`shared`, `external`, `abstract`, `final`, `mixin`),
  interfaces, enums (with an underlying type), funcdefs, typedefs and
  `import … from` declarations;
* functions, constructors, destructors, virtual properties (`get`/`set`),
  function attributes (`override`, `final`, `explicit`, `property`, `delete`);
* types with namespaces, templates (`array<Wheel@>`), handles (`@`, `@const`),
  arrays (`int[]`) and parameter modifiers (`&in`, `&out`, `&inout`);
* every statement, including `foreach` (2.37) and `try`/`catch`;
* expressions with AngelScript's operator precedence (the bitwise operators
  bind tighter than comparisons; `xor`/`^^` sits with `==`), handle
  comparison (`is`, `!is`), casts, lambdas, named arguments and
  initializer lists;
* `#include` and other preprocessor lines, and metadata such as `[editable]`
  before declarations.

## Use

Rust:

```toml
[dependencies]
tree-sitter-angelscript = { git = "https://github.com/MaxSensation/tree-sitter-anglescript" }
```

```rust
let mut parser = tree_sitter::Parser::new();
parser.set_language(&tree_sitter_angelscript::LANGUAGE.into())?;
```

`HIGHLIGHTS_QUERY` (`queries/highlights.scm`) colours it in editors that use
tree-sitter queries (Neovim, Helix, Zed and others).

## Develop

```sh
npm install            # the tree-sitter CLI
npx tree-sitter generate
npx tree-sitter test   # test/corpus
cargo test             # the Rust binding, the example and the query
```

`examples/kart.as` is a larger script that must parse without errors.

## Licence

Apache License 2.0, see [LICENSE](LICENSE).
