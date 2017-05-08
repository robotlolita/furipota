# FuriPota (フリポタ)

<img src="https://raw.githubusercontent.com/origamitower/furipota/logo/.github/furipota.png" alt="furipota logo" align="left">


> **NOTE**  
> This is a highly experimental project and if you use it in
> production **kittens will turn into people**.
> No-one would ever want that to happen, right?

**FuriPota** (short for *"Deep Fried Potatoes"* or *"(discrete) Functional Reactive
Programming Tasks"*) is a cross-platform, discrete FRP DSL for describing
better build pipelines. The goal is to have a system that has **deterministic**
and **fast** builds. That is, building from a FuriPota description should always
have the same results, and it should do that as fast as possible.

The model is simple: you define a closed system of discrete input streams and
their transformations (as pure functions). Dependencies are implicitly described
by such transformations. The description is fed to the FuriPota runtime, which
takes care of applying it to get the desired results.

[There's a vague roadmap here](https://www.evernote.com/shard/s215/sh/114a94ed-9b1f-4dcf-86f2-c0e59fce521a/d28809453db47741a6d9e8ea1520acad).


## Getting started

Install it with npm:

    $ npm install -g origamitower/furipota

Create a `build.frp` file:

    %furipota/1

    import core "prelude"

    export define hello-world =
      # Says "Hello, world"
      Stream.from-vector ["Hello", ", ", "world"]
        |> (x -> Stream.of (display x))

You can check which bindings are exported with `list`:

    furipota list

Finally, you can run the build pipeline passing a furipota expression to `run`:

    furipota run hello-world

Check the `examples/` folder and the `docs/` folder for more stuff.


## Licence

furipota is copyright (c) Quildreen Motta, and released under MIT.
