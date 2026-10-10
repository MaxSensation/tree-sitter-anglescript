/**
 * @file AngelScript grammar for tree-sitter
 * @license Apache-2.0
 *
 * Follows the AngelScript language reference (https://www.angelcode.com/angelscript/sdk/docs/manual/doc_script.html),
 * plus what the standard add-ons and game engines use: `#include` and other
 * preprocessor lines, and metadata such as `[editable]` before declarations.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// AngelScript's order (lowest first), which differs from C's: the bitwise
// operators bind tighter than comparisons, and `xor`/`^^` sits with `==`.
const PREC = {
  assign: 1,
  ternary: 2,
  or: 3,
  and: 4,
  equal: 5,
  compare: 6,
  bit_or: 7,
  bit_xor: 8,
  bit_and: 9,
  shift: 10,
  add: 11,
  mul: 12,
  pow: 13,
  unary: 14,
  postfix: 15,
  call: 16,
};

const PRIMITIVE_TYPES = [
  'void', 'bool', 'int', 'int8', 'int16', 'int32', 'int64',
  'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'float', 'double',
];

/**
 * @param {RuleOrLiteral} rule
 * @param {string} sep
 */
function sep1(rule, sep) {
  return seq(rule, repeat(seq(sep, rule)));
}

/** @param {RuleOrLiteral} rule */
function commaSep(rule) {
  return optional(sep1(rule, ','));
}

module.exports = grammar({
  name: 'angelscript',

  extras: $ => [/\s/, $.comment],

  word: $ => $.identifier,

  supertypes: $ => [$._expression, $._statement, $._declaration],

  conflicts: $ => [
    // `Foo` at the start of a statement: a type or an expression.
    [$._type_name, $._expression],
    // `a < b` or `array<int>(3)`.
    [$.construct_expression, $._expression],
    [$.construct_expression, $._type_name, $._expression],
    // `Foo f();`: a function prototype or a variable built with no arguments.
    [$.parameter_list, $.argument_list],
  ],

  rules: {
    script: $ => repeat($._top_level),

    _top_level: $ => choice($._declaration, $.preproc_include, $.preproc_directive, ';'),

    _declaration: $ => choice(
      $.namespace_declaration,
      $.class_declaration,
      $.interface_declaration,
      $.enum_declaration,
      $.funcdef_declaration,
      $.typedef_declaration,
      $.import_declaration,
      $.function_declaration,
      $.virtual_property_declaration,
      $.variable_declaration,
      $.metadata,
    ),

    // ---------------------------------------------------------------- lexical

    comment: _ => token(choice(
      seq('//', /[^\n]*/),
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),
    )),

    identifier: _ => /[A-Za-z_][A-Za-z0-9_]*/,

    number: _ => token(choice(
      /0[xX][0-9a-fA-F_]+/,
      /0[bB][01_]+/,
      /0[oO][0-7_]+/,
      /0[dD][0-9_]+/,
      /[0-9][0-9_]*\.[0-9_]*([eE][+-]?[0-9]+)?[fFdD]?/,
      /\.[0-9][0-9_]*([eE][+-]?[0-9]+)?[fFdD]?/,
      /[0-9][0-9_]*[eE][+-]?[0-9]+[fFdD]?/,
      /[0-9][0-9_]*[fF]/,
      /[0-9][0-9_]*/,
    )),

    string: $ => choice(
      seq('"""', optional(alias(/([^"]|"[^"]|""[^"])+/, $.string_content)), '"""'),
      seq('"', repeat(choice(alias(token.immediate(prec(1, /[^"\\\n]+/)), $.string_content), $.escape_sequence)), '"'),
      seq('\'', repeat(choice(alias(token.immediate(prec(1, /[^'\\\n]+/)), $.string_content), $.escape_sequence)), '\''),
    ),

    escape_sequence: _ => token.immediate(seq('\\', choice(
      /[^xuU0-9]/,
      /[0-9]{1,3}/,
      /x[0-9a-fA-F]{1,4}/,
      /u[0-9a-fA-F]{4}/,
      /U[0-9a-fA-F]{8}/,
    ))),

    boolean: _ => choice('true', 'false'),
    null: _ => 'null',
    this: _ => 'this',
    super: _ => 'super',

    // ---------------------------------------------------------- preprocessor

    preproc_include: $ => seq(/#[ \t]*include/, field('path', $.string), /\r?\n/),

    preproc_directive: _ => token(seq('#', /[ \t]*[a-z]+/, /[^\n]*/)),

    /// `[editable]`, `[hidden, range(0, 10)]`: metadata for the declaration
    /// that follows (read by the script builder add-on and game engines).
    metadata: _ => token(seq('[', /[^\[\]\n]*(\[[^\[\]\n]*\][^\[\]\n]*)*/, ']')),

    // ----------------------------------------------------------------- types

    primitive_type: _ => choice(...PRIMITIVE_TYPES),

    /// `Game::Kart`, `::print`: a name inside namespaces (built left to right,
    /// so `a::b::c` is `(a::b)::c`).
    qualified_name: $ => prec.left(seq(
      optional(field('scope', choice($.identifier, $.qualified_name))),
      '::',
      field('name', $.identifier),
    )),

    _type_name: $ => choice($.primitive_type, $.identifier, $.qualified_name, '?', 'auto'),

    template_argument_list: $ => seq('<', commaSep($.type), '>'),

    type: $ => prec.right(seq(
      optional('const'),
      $._type_name,
      optional($.template_argument_list),
      repeat(choice(
        alias(seq('[', ']'), $.array_suffix),
        alias(seq('@', optional('const')), $.handle_suffix),
      )),
    )),

    type_modifier: _ => seq('&', optional(choice('in', 'out', 'inout'))),

    // ---------------------------------------------------------- declarations

    /// `shared`, `external`, `abstract`, `final`, `mixin`, `private`,
    /// `protected`, in any order, before a declaration.
    modifiers: _ => repeat1(choice('shared', 'external', 'abstract', 'final', 'mixin', 'private', 'protected')),

    namespace_declaration: $ => seq(
      'namespace',
      field('name', sep1($.identifier, '::')),
      field('body', $.declaration_list),
    ),

    declaration_list: $ => seq('{', repeat($._top_level), '}'),

    class_declaration: $ => seq(
      optional($.modifiers),
      'class',
      field('name', $.identifier),
      optional(field('bases', $.base_list)),
      choice(';', field('body', $.class_body)),
    ),

    base_list: $ => seq(':', sep1(choice($.identifier, $.qualified_name), ',')),

    class_body: $ => seq('{', repeat($._member), '}'),

    _member: $ => choice(
      $.function_declaration,
      $.constructor_declaration,
      $.destructor_declaration,
      $.virtual_property_declaration,
      $.variable_declaration,
      $.funcdef_declaration,
      $.metadata,
      ';',
    ),

    interface_declaration: $ => seq(
      optional($.modifiers),
      'interface',
      field('name', $.identifier),
      optional(field('bases', $.base_list)),
      choice(';', field('body', $.interface_body)),
    ),

    interface_body: $ => seq('{', repeat(choice(
      alias($.interface_method, $.function_declaration),
      $.virtual_property_declaration,
      $.metadata,
    )), '}'),

    interface_method: $ => seq(
      field('type', $.type),
      optional('&'),
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      optional('const'),
      ';',
    ),

    enum_declaration: $ => seq(
      optional($.modifiers),
      'enum',
      field('name', $.identifier),
      optional(seq(':', field('underlying', $.primitive_type))),
      choice(';', field('body', $.enumerator_list)),
    ),

    enumerator_list: $ => seq('{', commaSep($.enumerator), optional(','), '}'),

    enumerator: $ => seq(field('name', $.identifier), optional(seq('=', field('value', $._expression)))),

    funcdef_declaration: $ => seq(
      optional($.modifiers),
      'funcdef',
      field('type', $.type),
      optional('&'),
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      ';',
    ),

    typedef_declaration: $ => seq('typedef', field('type', $.primitive_type), field('name', $.identifier), ';'),

    /// `import void f(int) from "module";`
    import_declaration: $ => seq(
      'import',
      field('type', $.type),
      optional('&'),
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      repeat($.function_attribute),
      'from',
      field('module', $.string),
      ';',
    ),

    function_attribute: _ => choice('override', 'final', 'explicit', 'property', 'delete'),

    function_declaration: $ => seq(
      optional($.modifiers),
      field('type', $.type),
      optional('&'),
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      optional('const'),
      repeat($.function_attribute),
      choice(';', field('body', $.block)),
    ),

    constructor_declaration: $ => seq(
      optional($.modifiers),
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      repeat($.function_attribute),
      choice(';', field('body', $.block)),
    ),

    destructor_declaration: $ => seq(
      optional($.modifiers),
      '~',
      field('name', $.identifier),
      '(', ')',
      choice(';', field('body', $.block)),
    ),

    // `(void)` is a parameter of type void with no name.
    parameter_list: $ => seq('(', optional(seq(sep1($.parameter, ','), optional(seq(',', '...')))), ')'),

    parameter: $ => prec.dynamic(1, seq(
      field('type', $.type),
      optional($.type_modifier),
      optional(field('name', $.identifier)),
      optional(seq('=', field('default', $._expression))),
    )),

    virtual_property_declaration: $ => seq(
      optional($.modifiers),
      field('type', $.type),
      optional('&'),
      field('name', $.identifier),
      field('body', $.accessor_list),
    ),

    accessor_list: $ => seq('{', repeat($.accessor), '}'),

    accessor: $ => seq(
      choice('get', 'set'),
      optional('const'),
      repeat($.function_attribute),
      choice(';', field('body', $.block)),
    ),

    variable_declaration: $ => prec.dynamic(1, seq(
      optional($.modifiers),
      field('type', $.type),
      sep1($.variable_declarator, ','),
      ';',
    )),

    variable_declarator: $ => seq(
      field('name', $.identifier),
      optional(choice(
        seq('=', field('value', choice($._expression, $.initializer_list))),
        field('arguments', $.argument_list),
      )),
    ),

    initializer_list: $ => seq('{', commaSep(choice($._expression, $.initializer_list)), optional(','), '}'),

    // ------------------------------------------------------------ statements

    _statement: $ => choice(
      $.block,
      $.local_variable_declaration,
      $.expression_statement,
      $.if_statement,
      $.for_statement,
      $.foreach_statement,
      $.while_statement,
      $.do_statement,
      $.switch_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.try_statement,
      $.empty_statement,
    ),

    block: $ => seq('{', repeat($._statement), '}'),

    local_variable_declaration: $ => prec.dynamic(1, seq(
      field('type', $.type),
      sep1($.variable_declarator, ','),
      ';',
    )),

    expression_statement: $ => seq($._expression, ';'),

    empty_statement: _ => ';',

    if_statement: $ => prec.right(seq(
      'if', '(', field('condition', $._expression), ')',
      field('consequence', $._statement),
      optional(seq('else', field('alternative', $._statement))),
    )),

    for_statement: $ => seq(
      'for', '(',
      field('initializer', choice($.local_variable_declaration, $.expression_statement, ';')),
      optional(field('condition', $._expression)), ';',
      commaSep(field('update', $._expression)),
      ')',
      field('body', $._statement),
    ),

    /// `foreach (auto value, auto index : container)` (AngelScript 2.37).
    foreach_statement: $ => seq(
      'foreach', '(',
      sep1(seq(field('type', $.type), field('name', $.identifier)), ','),
      ':',
      field('container', $._expression),
      ')',
      field('body', $._statement),
    ),

    while_statement: $ => seq('while', '(', field('condition', $._expression), ')', field('body', $._statement)),

    do_statement: $ => seq('do', field('body', $._statement), 'while', '(', field('condition', $._expression), ')', ';'),

    switch_statement: $ => seq(
      'switch', '(', field('value', $._expression), ')',
      '{', repeat($.switch_case), '}',
    ),

    switch_case: $ => seq(
      choice(seq('case', field('value', $._expression)), 'default'),
      ':',
      repeat($._statement),
    ),

    return_statement: $ => seq('return', optional($._expression), ';'),
    break_statement: _ => seq('break', ';'),
    continue_statement: _ => seq('continue', ';'),

    try_statement: $ => seq('try', field('body', $.block), 'catch', field('handler', $.block)),

    // ----------------------------------------------------------- expressions

    _expression: $ => choice(
      $.identifier,
      $.qualified_name,
      $.number,
      $.string,
      $.boolean,
      $.null,
      $.this,
      $.super,
      $.parenthesized_expression,
      $.assignment_expression,
      $.ternary_expression,
      $.binary_expression,
      $.unary_expression,
      $.update_expression,
      $.call_expression,
      $.member_expression,
      $.index_expression,
      $.cast_expression,
      $.construct_expression,
      $.lambda_expression,
      $.primitive_type,
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    assignment_expression: $ => prec.right(PREC.assign, seq(
      field('left', $._expression),
      field('operator', choice('=', '+=', '-=', '*=', '/=', '%=', '**=', '&=', '|=', '^=', '<<=', '>>=', '>>>=')),
      field('right', $._expression),
    )),

    ternary_expression: $ => prec.right(PREC.ternary, seq(
      field('condition', $._expression), '?',
      field('consequence', $._expression), ':',
      field('alternative', $._expression),
    )),

    binary_expression: $ => {
      const table = [
        [PREC.or, choice('||', 'or')],
        [PREC.and, choice('&&', 'and')],
        [PREC.bit_or, '|'],
        [PREC.bit_xor, '^'],
        [PREC.bit_and, '&'],
        [PREC.equal, choice('==', '!=', 'is', '!is', '^^', 'xor')],
        [PREC.compare, choice('<', '<=', '>', '>=')],
        [PREC.shift, choice('<<', '>>', '>>>')],
        [PREC.add, choice('+', '-')],
        [PREC.mul, choice('*', '/', '%')],
      ];
      return choice(
        ...table.map(([p, op]) => prec.left(/** @type {number} */ (p), seq(
          field('left', $._expression),
          // @ts-ignore
          field('operator', op),
          field('right', $._expression),
        ))),
        prec.right(PREC.pow, seq(field('left', $._expression), field('operator', '**'), field('right', $._expression))),
      );
    },

    unary_expression: $ => prec(PREC.unary, seq(
      field('operator', choice('-', '+', '!', 'not', '~', '@')),
      field('operand', $._expression),
    )),

    update_expression: $ => choice(
      prec(PREC.unary, seq(field('operator', choice('++', '--')), field('operand', $._expression))),
      prec(PREC.postfix, seq(field('operand', $._expression), field('operator', choice('++', '--')))),
    ),

    call_expression: $ => prec(PREC.call, seq(field('function', $._expression), field('arguments', $.argument_list))),

    argument_list: $ => seq('(', commaSep($.argument), ')'),

    argument: $ => seq(optional(seq(field('name', $.identifier), ':')), field('value', $._expression)),

    member_expression: $ => prec(PREC.call, seq(field('object', $._expression), '.', field('member', $.identifier))),

    index_expression: $ => prec(PREC.call, seq(
      field('object', $._expression),
      '[', commaSep($.argument), ']',
    )),

    cast_expression: $ => seq('cast', '<', field('type', $.type), '>', '(', field('value', $._expression), ')'),

    /// `array<int>(3)`: a template type constructed as a value.
    construct_expression: $ => seq(
      field('name', $.identifier),
      field('template', $.template_argument_list),
      field('arguments', $.argument_list),
    ),

    lambda_expression: $ => seq(
      'function',
      '(', commaSep($.lambda_parameter), ')',
      field('body', $.block),
    ),

    lambda_parameter: $ => choice(
      field('name', $.identifier),
      seq(field('type', $.type), optional($.type_modifier), field('name', $.identifier)),
    ),
  },
});
