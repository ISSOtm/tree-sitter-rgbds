/**
 * @file RGBDS assembly
 * @author ISSOtm <rgbds@eldred.fr>
 * @license MPL-2.0
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const ident = (/** @type string[] */ ...names) => new RustRegex(`(?i)${names.join("|")}`);

module.exports = grammar({
  name: "rgbasm",

  word: ($) => $._nonlocal_ident,
  extras: ($) => [$._whitespace, $.comment, $._line_cont, $._macro_arg],

  rules: {
    source_file: ($) => seq(optional($._lines), optional($._line)),
    _lines: ($) => repeat1(seq(optional($._line), "\n")),
    _line: ($) =>
      choice($.label, seq(optional($.label), choice($._directive, $.instruction, $.macro_call))),

    label: ($) =>
      choice(
        seq(field("name", $._nonlocal_ident), token.immediate(/::?/)),
        seq(
          field(
            "name",
            choice(/\.[A-Za-z0-9_@#$]*/, /[A-Za-z_][A-Za-z0-9_@#$]*\.[A-Za-z0-9_@#$]*/),
          ),
          optional(/::?/),
        ),
        ":",
      ),

    macro_call: ($) =>
      seq(
        field("name", $._nonlocal_ident),
        repeat(seq($.macro_call_arg, ",")),
        optional($.macro_call_arg),
      ),
    macro_call_arg: (_$) => /([^,\n]|\\,|"(?:[^"]|\\")*")*/,

    instruction: ($) =>
      seq(
        ident(
          "adc",
          "add",
          "and",
          "bit",
          "call",
          "ccf",
          "cp",
          "cpl",
          "daa",
          "dec",
          "di",
          "ei",
          "halt",
          "inc",
          "jp",
          "jr",
          "ld",
          "ldh",
          "or",
          "pop",
          "push",
          "res",
          "ret",
          "reti",
          "rl",
          "rla",
          "rlc",
          "rlca",
          "rr",
          "rra",
          "rrc",
          "rrca",
          "rst",
          "sbc",
          "scf",
          "set",
          "sla",
          "sra",
          "srl",
          "stop",
          "sub",
          "swap",
          "xor",
        ),
        optional(seq($._operand, optional(seq(",", $._operand)))),
      ),
    _operand: ($) =>
      choice(
        prec(0, $.expression),
        prec(1, seq("[", $.expression, "]")), // Direct memory access.
        prec(1, seq("[", ident("bc", "de", "hl"), "]")), // Indirect memory access.
        prec(1, ident("af", "bc", "de", "hl", "a", "b", "c", "d", "e", "h", "l", "nc", "z", "nz")), // 16-bit register, 8-bit register, or condition code.
        prec(1, seq(ident("sp"), optional(seq(/[+-]/, $.expression)))), // SP + offset
      ),

    _directive: ($) =>
      choice(
        $.macro_def,
        $.rept,
        $.for,
        ident("break"),
        $.include,
        $.if,
        $.def,
        $.print,
        $.export,
        $.data,
        $.ds,
        $.section,
        ident("rsreset"),
        $.rsset,
        ident("union"),
        ident("nextu"),
        ident("endu"),
        $.incbin,
        $.charmap,
        $.newcharmap,
        $.setcharmap,
        ident("pushc"), // The version with arguments is taken care of by `setcharmap`.
        ident("popc"),
        // `LOAD` is taken care of by `section`.
        ident("endl"),
        $.shift,
        $.fail,
        $.warn,
        $.assert,
        $.purge,
        ident("pushs"), // The version with arguments is taken care of by `section`.
        ident("pops"),
        ident("endsection"),
        $.opt,
        ident("pusho"), // The version with arguments is taken care of by `opt`.
        ident("popo"),
        $.align,
      ),
    macro_def: ($) =>
      seq(ident("macro"), field("name", $.identifier), "\n", optional($._lines), ident("endm")),
    rept: ($) => seq(ident("rept"), $.expression, "\n", optional($._lines), ident("endr")),
    for: ($) =>
      seq(
        ident("for"),
        $.identifier,
        ",",
        $.expression,
        optional(seq(",", $.expression)),
        "\n",
        optional($._lines),
        ident("endr"),
      ),
    include: ($) => seq(ident("include"), $._string_expr),
    if: ($) =>
      seq(
        ident("if"),
        "\n",
        optional($._lines),
        repeat(seq(ident("elif"), $.expression, "\n", optional($._lines))),
        optional(seq(ident("else"), $.expression, "\n", optional($._lines))),
        ident("endc"),
      ),
    def: ($) =>
      seq(
        optional("export"),
        ident("def", "redef"),
        field("name", $.identifier),
        choice(
          seq(ident("equ", "rb", "rw", "rl", "(?:[-+*/%^|&]|<<|>>)?="), $.expression),
          seq(ident("equs"), $._string_expr),
        ),
      ),
    print: ($) =>
      seq(ident("print", "println"), repeat(seq($.expression, ",")), optional($.expression)),
    export: ($) => seq(ident("export"), repeat(seq($.identifier, ",")), optional($.identifier)),
    data: ($) =>
      seq(ident("db", "dw", "dl"), repeat(seq($.expression, ",")), optional($.expression)),
    ds: ($) =>
      seq(
        ident("ds"),
        optional(seq(ident("align"), "[", $.expression, optional(seq(",", $.expression)), "]")),
        optional(seq($.expression, optional(seq(",", $.expression)))),
      ),
    section: ($) =>
      seq(
        ident("section", "pushs", "load"),
        $._string_expr,
        ",",
        ident("rom0", "romx", "vram", "sram", "wram0", "wramx", "oam", "hram"),
        optional(seq("[", $.expression, "]")),
        repeat(
          seq(
            ",",
            choice(
              seq(ident("bank"), "[", $.expression, "]"),
              seq(ident("align"), "[", $.expression, optional(seq(",", $.expression)), "]"),
            ),
          ),
        ),
      ),
    rsset: ($) => seq(ident("rsset"), $.expression),
    incbin: ($) =>
      seq(
        ident("incbin"),
        $._string_expr,
        optional(seq(",", $.expression, optional(seq(",", $.expression)))),
      ),
    charmap: ($) => seq(ident("charmap"), $.identifier),
    newcharmap: ($) => seq(ident("newcharmap"), $.identifier, optional(seq(",", $.identifier))),
    setcharmap: ($) => seq(ident("setcharmap", "pushc"), $.identifier),
    shift: ($) => seq(ident("shift"), optional($.expression)),
    fail: ($) => seq(ident("fail"), $._string_expr),
    warn: ($) => seq(ident("warn"), $._string_expr),
    assert: ($) =>
      seq(
        ident("assert", "static_assert"),
        optional(ident("warn", "fail", "fatal")),
        $.expression,
        optional(seq(",", $._string_expr)),
      ),
    purge: ($) => seq(ident("purge"), $.identifier, repeat(seq(",", $.identifier)), optional(",")),
    opt: (_$) => seq(ident("opt", "pusho"), /[^,\n]*/, repeat(seq(",", /[^,\n]*/)), optional(",")),
    align: ($) => seq(ident("align"), $.expression, optional(seq(",", $.expression))),

    expression: ($) =>
      choice(
        $._symbol,
        $.number,
        $._string_expr,
        seq("(", $.expression, ")"),
        // TODO: built-in func calls
        seq($.identifier, "(", repeat(seq($.expression, ",")), optional($.expression), ")"),
        prec.right("exp", seq($.expression, "**", $.expression)),
        prec("unary", seq(/[-+~!]/, $.expression)),
        prec.left("mul", seq($.expression, /[*/%]/, $.expression)),
        prec.left("shift", seq($.expression, /<<|>>>?/, $.expression)),
        prec.left("bit", seq($.expression, /[&|^]/, $.expression)),
        prec.left("add", seq($.expression, /[+-]/, $.expression)),
        prec.left("cmp", seq($.expression, /[=!<>]=|[<>]/, $.expression)),
        prec.left("&&", seq($.expression, "&&", $.expression)),
        prec.left("||", seq($.expression, "||", $.expression)),
      ),

    _string_expr: ($) => choice($.string),

    _symbol: ($) => choice($.identifier, "@"),
    identifier: ($) => choice($._nonlocal_ident, /#?[A-Za-z_.][A-Za-z0-9._$@#]*/),
    _nonlocal_ident: (_$) => /#?[A-Za-z_][A-Za-z0-9_$@#]*/,
    number: (_$) =>
      choice(
        /[0-9]+(?:_[0-9]+)*/, // Decimal.
        /\$[0-9A-Fa-f]+(?:_[0-9A-Fa-f]+)*/, // Hexadecimal.
        /%[01]+(?:_[01]+)*/, // Binary.
        /&[0-7]+(?:_[0-7]+)*/, // Octal.
        /`[0-3]+(?:_[0-3]+)*/, // Graphics.
      ),
    string: (_$) =>
      choice(
        /"(?:[^"\n]|\\")*"/, // String.
        /"""(?:"?"?[^"]|"?"?\")*"""/, // Multi-line string.
        /#"[^"\n]"/, // Raw string.
        /#"""(?:"?"?[^"])*"""/, // Raw multi-line string.
      ),

    _whitespace: (_$) => /[ \t\r]+/,
    _line_cont: (_$) => /\\[ \t]*(?:;[^\n]*)?\n/,
    comment: (_$) => choice(/;[^\n]*/, /\/*(?:[^*]|\*[^/])*\*\//),

    _macro_arg: ($) =>
      seq(
        $.macro_arg,
        /[^\n]*/, // Gobble the rest of the line.
      ),
    macro_arg: (_$) => /\\(?:[1-9#@]|<(?:[0-9A-za-z_][0-9A-za-z_.@#$]*)>)/,
  },

  precedences: (_$) => [["||", "&&", "cmp", "add", "bit", "shift", "mul", "unary", "exp"]],
});
