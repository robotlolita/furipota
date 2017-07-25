# Furipota's Grammar

This file describes the grammar for Furipota.


## Lexical structure

Furipota is a language with ML-inspired syntax. It has no semantic indentation or newlines, and uses `#` for line-comments. Instead of newlines or semicolons as separators, Furipota uses leading keywords to disambiguate.

Unlike most languages, Furipota uses Lisp-style identifiers.

```hs
letter = "A" .. "Z" | "a" .. "z"
digit  = "0" .. "9"

Identifier = identifier_start identifier_rest*

identifier_start = letter
identifier_rest  = letter | digit | "-"

Infix = "==="
      | "=/="
      | ">"
      | ">="
      | "<"
      | "<="
      | "+"
      | "-"
      | "*"
      | "/"
```


## Module

A Furipota module is made out of a version tag and a sequence of [Declarations](#declaration).

```hs
Module = Version Declaration*

Version = "%furipota/1"
```


## Declaration

Furipota's top-level in modules is restricted to declarations. A declaration may be a function definition, an import declaration, or an export declaration.

```hs
Declaration = Define | Import | Export
```


### Define

Functions are defined by the `define` form in Furipota, which is only available at the top-level. All names in a module are late-bound, thus even things one would consider a "variable" or "field" in another language are defined as a function, only it takes no parameters.

Nullary functions are memoised.

Functions may be of one of the following forms:

```dylan
define function-name =
  # Docs go here
  the function code

define function-name arg1 arg2 ... arg-n @ options =
  # Docs go here
  the function code

define arg1 + arg2 =
  # Docs go here
  the function code
```

```hs
Define = "define" Identifier                  "=" Documentation? Expression
       | "define" Identifier Arguments        "=" Documentation? Expression
       | "define" Identifier Infix Identifier "=" Documentation? Expression

Arguments = Identifier+ ("@" Identifier)?

Documentation = Comment+
```


### Import

An import declaration defines a binding from names in another module in the current module's lexical scope. It supports conflict resolution through restriction, aliasing, and renaming.


```hs
Import = "import" Kind? Text "as" Identifier
       | "import" Kind? Text ImportModifier

Kind = "core" | "plugin"

ImportModifier = "exposing" ImportBindingList
               | "excluding" ImportSymbolList

ImportSymbolList = Identifier ("," Identifier)*

ImportBindingList = ImportBinding ("," ImportBinding)*

ImportBinding = Identifier "as" Identifier
              | Identifier
```


### Export

An export declaration specifies which bindings are available outside of the module's code.

```hs
Export = "export" Define
       | "export" Identifier "as" Identifier
       | "export" Identifier
```


## Expressions

