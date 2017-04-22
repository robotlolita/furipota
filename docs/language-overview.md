# An overview of Furipota

Furipota is a discrete FRP DSL for describing better build pipelines. Incidentally, Furipota may also be used as a sort-of general purpose functional language and for shell scripting. The implementation uses a tree-walking interpreter running on Node, and uses JavaScript as an extension language. Furipota's performance itself is not great, but since all expensive computations are done in JavaScript directly, this isn't much of a problem.


## The model

So, what does "discrete FRP" mean anyway? [Functional Reactive Programming](http://stackoverflow.com/a/1030631), according to Conal Elliot, is a system of continuously evolving streams described through denotational semantics. In essence, it models values over time as a first-class concept, and allows one to combine them like any other kind of discrete value (e.g.: a number). The continuous part is at the core of the FRP model.

Furipota most definitely isn't that, so everywhere you see "discrete FRP", just understand it to be "a functional model mostly based on the definition and transformation of **discrete** streams of values over time". It's up to users to decide how to synchronise these streams, and determinism **is not** a part of the model.

So, even though I'm calling it "discrete FRP", the concept is much closer to [Erik Meijer's reactive programming with observables](https://www.youtube.com/watch?v=sTSQlYX5DU0), than Conal Elliot's FRP. Note, however, that Furipota does not have the [hot vs. cold observables issue](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/gettingstarted/creating.md#cold-vs-hot-observables) as streams are pure and only executed at the top level (although JavaScript plugins may mess this up).


## The functional part

Furipota is primarily a functional language, a bit like Haskell without the types. It's made out of very few primitive concepts:


##### Numbers

Furipota uses a single numeric type: 64-bit floating point numbers based on IEEE-754, just like JavaScript. Unlike JavaScript, numeric literals in Furipota may contain `_` characters to separate thousands:

```ruby
1_000.00  # ==> 1000
1000      # ==> 1000
```

##### Text

Furipota's textual type is called `Text`. Furipota has two ways of introducing textual data.

The raw text form:

```python
"""
None of the characters
"here" are intepreted
in any special way \no
"""
# "\nNone of the characters\n\"here\" are interpreted\nin any special way \\no\n"
```

And the interpolated text form, which uses `\` as an escape character, and `{...}` for embedding expressions:

```ruby
"2 + 2 is:\n {2 + 2}"
# => "2 + 2 is:\n 4"
```

Since Furipota is a more strict language about which kinds of values can be used in each function, text is only used for textual data meant to be readable by humans, not interpreted by programs.

##### Boolean

Logical values, either `true` or `false`.


##### Vector

Dynamic sequences of values. Vectors use the same syntax as JavaScript's Arrays, and are represented as JavaScript arrays underneath.

```ruby
[1 + 0, 1 + 1, 1 + 2]
# => [1, 2, 3]
```


##### Records

Pairs of symbols and values. Records are represented as JavaScript's objects, however Furipota ignores all prototypical delegation.

```ruby
-hello: 1  -world: 2
# => { "hello": 1, "world": 2 }
```

Empty records use the `{}` syntax for now, but will most likely move to a function in the future.

Properties of a record can be acessed with the `.` syntax:

```ruby
(-hello: 1).hello
# => 1
```


##### Functions

Finally, Furipota has functions. Functions are first-class computations that receive *exactly* two arguments: a positional argument of any type, and a *record* that provides options for that function.

```ruby
let say = (message @ options -> "Hello {message}")
in
say "world" @ -options: "here"
# => "Hello world"
```

The record is always optional, so one may always omit it:

```ruby
let say = (message -> "Hello {message}")
in 
say "world"
# => "Hello world"
```

Functions that look like multi-parameter functions, such as `1 + 2` or `Vector.concat [] [2]` are just 1-argument functions that return another function:

```ruby
let say = (name -> message -> "{name} says: Hello {message}")
in
(say "Quil") "world"
# => "Quil says: Hello world"
```

Because writing lambdas directly can be a pain for functions that take more than one argument, there's a syntax sugar for this:

```ruby
let say name message = "{name} says: Hello {message}"
in say "Quil" "world"
# (function application is left-associative, so parenthesis aren't needed)
```

Infix functions may also be defined. Furipota supports only `===`, `=/=`, `>`, `>=`, `<=`, `+`, `-`, `*` and `/` as valid infix names, but any function can be used as infix by preceding its name with `\``. 

```hs
let a + b = "{a}{b}"
in "hello" + "world"
# => "helloworld"

let cat a b = "{a}{b}"
in "hello" `cat "world"
# => "worldhello"
```

## Logical operators

The `and`, `or` and `not` operators are just regular infix and prefix functions. The `if...then...else` construct is an expression that evaluates the consequent or alternate depending on the value of the condition:

```ruby
if 2 < 3 then "less than" else "greater than"
```


## Tagged data

Furipota does not have classes or [tagged unions](https://en.wikipedia.org/wiki/Tagged_union), instead it uses the simpler concept of [open variants](https://caml.inria.fr/pub/docs/u3-ocaml/ocaml051.html). In Furipota in particular, an open variant is just a *tagged* value: a value and its associated "type identifier".

You put values into tags with the `^Tag value` syntax:

```ruby
define one = ^Int 1
```

And you extract values from tags with the `match` function:

```ruby
match one
  -Int value: (value + 1)
```

## Modules and definitions

A Furipota file is a module, and modules have a different grammar than expressions do. A module must start with a language version identifier, and may only contain declarations at its top level:

```ruby
%furipota/1

define hello = "world"
```

> Note that comments are valid before the version identifier, thus:
>
>     #!/usr/bin/env furipota-run
>     %furipota/1
>     import core "prelude"
>     define main = Debug.log "hello world"
>
> Is valid.

Modules can export one or more definitions by using the `export` syntax:

```ruby
export define hello = "world"

export hello

export hello as HELLO
```

Modules can also import definitions with the `import` syntax. There are three kinds of modules that can be imported:

  - `core` modules are built-in Furipota modules, and they define primitives used by most scripts;
  - `plugin` modules are JavaScript modules defined by the user, or installed through `npm`. Their module identifier is the same one would pass to a `require` call in Node.
  - `furipota` modules are files written in Furipota. These must be a relative or absolute filesystem path for now.

```ruby
import core "prelude"                 # imports a core module
import plugin "furipota-npm" as npm   # like `const npm = require('furipota-npm')`
import "./thing.frp"                  # loads all definitions from thing.frp
```

Unless one provides an alias for the module, all of its definitions will be added to the module's scope, and an error will be thrown if any of the provided defintions conflict with existing definitions in the module.


## Streams

Streams are the main concept in Furipota. Most computations are done on streams, and all effectful computations are done on streams.

A stream is a sequence of values that is produced over time, and may eventually end. They have two channels: `Value` for the main output, and `Error` for error output, somewhat similar to shell streams.

Since the API for creating streams is currently very low-level, creating streams is done mostly entirely in JavaScript, whereas Furipota scripts just combine and transform them.

The main transformation on streams is the `|>`, called `chain`. The operator takes a stream and a function, then transforms every value in the source stream with the given function. The function must return a new stream. All returned streams are combined into one, which is the result of applying the operator:

```ruby
let nat = Stream.from-vector [1, 2, 3]
in
nat |> (x -> Stream.from-vector [x - 0.5, x])
# => 0.5, 1, 1.5, 2, 2.5, 3
```

The core streams library also defines some other common functional transformations, such as `map`, `filter`, and `fold`.

Streams can be combined with the `merge` and `concatenate` operators (aliased `parallel` and `sequential`, respectively):


## Shell sublanguage

Since a lot of build system tooling is invoked as external processes, Furipota includes a small shell sublanguage. The sublanguage is intended to be a safe way of invoking a process and returning its contents as a Furipota stream.

For example:

```ruby
Debug.trace (
  parallel [
    $('echo "hello" '-n),
    $('echo "world" '-n)
  ]
)

# => (either "worldhello" or "helloworld")
```

In the sublanguage, all *static* information is defined as a symbol (e.g.: `'echo` and `'-n`). Symbols are any text that don't have a space character. All non-static information is going to be a regular Furipota expression, and that expression has to evaluate to either a `Path` type or a `Text` type. Finally, vectors can be dynamically added to a shell command with the `...expr` syntax.

```ruby
   let name = path "a long process name"
in let arg  = "more long args"
in $(name '--thing arg '--no-more-things)
# will execute:
#   "a long process name" --thing "more long args" --no-more-things
```

In the end, all arguments to the shell are properly quoted, and a Furipota stream is returned, getting values from STDOUT and errors from STDERR.


## Imperative sublanguage

Furipota is a functional language, but a lot of build system is done with imperative commands. To better support those, Furipota includes a restricted imperative sublanguage, like `do` notation in Haskell. The sublanguage works on streams, and has few instructions:

  - `call <expr>` evaluates a functional expression for side-effects, discards its result;
  - `action <expr>` executes a expression for effects. The expression must return a stream. The rest of the computation will proceed once the stream ends.
  - `let <x> = <expr>` evaluates a functional expressio and binds its value to `x` for the rest of the block.
  - `if <x> then <y...> else <z...>` like `if...then...else`, but `y` and `z` must be valid DO instructions.
  - `bind <x> <- <expr>` executes an expression, which must return a stream. Executes the rest of the block with `x` bound to each value in the stream.
  - `return <expr>` evaluates an expression and puts its result in a Stream. May only be used as the last expression.

The result of a `do` expression is always a stream, even if an empty stream.

Example:

```
define main = Debug.trace (
do
  action $('echo "hello")
  bind x <- Stream.from-vector [1, 2, 3]
  let double = x * 2
  if x > 2 then
    action Debug.log "{x} > 2"
    return double
  else
    action Debug.log "{x} < 2"
    return x
)
```


## Using Furipota for shell-scripting

You can use Furipota for shell scripting by putting `furipota-run` in your path (`npm install -g origamitower/furipota` will do just that), using a hashbang, and providing a `main` definition.

```ruby
#!/usr/bin/env furipota-run
%furipota/1

import core "prelude"

export define main = Debug.log "hello world"
```