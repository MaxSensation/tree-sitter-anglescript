; AngelScript highlights.

(comment) @comment
(string) @string
(escape_sequence) @string.escape
(number) @number
(boolean) @boolean
(null) @constant.builtin
[(this) (super)] @variable.builtin
(metadata) @attribute
[(preproc_include) (preproc_directive)] @keyword.directive

(primitive_type) @type.builtin
(type (identifier) @type)
(type (qualified_name name: (identifier) @type))
(base_list (identifier) @type)
(template_argument_list (type (identifier) @type))

(class_declaration name: (identifier) @type)
(interface_declaration name: (identifier) @type)
(enum_declaration name: (identifier) @type)
(funcdef_declaration name: (identifier) @type)
(typedef_declaration name: (identifier) @type)
(namespace_declaration name: (identifier) @module)
(namespace_declaration name: (qualified_name name: (identifier) @module))
(qualified_name scope: (identifier) @module)
(enumerator name: (identifier) @constant)

(function_declaration name: (identifier) @function)
(constructor_declaration name: (identifier) @constructor)
(destructor_declaration name: (identifier) @constructor)
(import_declaration name: (identifier) @function)
(call_expression function: (identifier) @function.call)
(call_expression function: (qualified_name name: (identifier) @function.call))
(call_expression function: (member_expression member: (identifier) @function.method.call))
(construct_expression name: (identifier) @type)

(parameter name: (identifier) @variable.parameter)
(lambda_parameter name: (identifier) @variable.parameter)
(virtual_property_declaration name: (identifier) @property)
(member_expression member: (identifier) @property)
(argument name: (identifier) @variable.parameter)

[
  "class" "interface" "enum" "namespace" "funcdef" "typedef" "import" "from"
  "mixin" "shared" "external" "abstract" "final" "private" "protected"
  "override" "explicit" "property" "delete" "const" "get" "set" "in" "out" "inout"
  "auto" "cast" "function"
] @keyword

[
  "if" "else" "for" "foreach" "while" "do" "switch" "case" "default"
  "break" "continue" "return" "try" "catch"
] @keyword.control

[
  "=" "+=" "-=" "*=" "/=" "%=" "**=" "&=" "|=" "^=" "<<=" ">>=" ">>>="
  "+" "-" "*" "/" "%" "**" "++" "--" "!" "~" "@" "&" "|" "^" "<<" ">>" ">>>"
  "==" "!=" "<" "<=" ">" ">=" "&&" "||" "^^" "?" ":" "::"
  "and" "or" "xor" "not" "is" "!is"
] @operator

["(" ")" "[" "]" "{" "}"] @punctuation.bracket
["," ";" "."] @punctuation.delimiter
