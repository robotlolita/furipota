# furipota

> **NOTE**  
> This is a highly experimental project and if you use it in
> production **kittens will turn into people**.
> No-one would ever want that to happen, right?

furipota (short for "Deep Fried Potatoes" or "(discrete) Functional Reactive
Programming Tasks") is a discrete FRP DSL for describing better build pipelines.
You define a closed system of discrete input streams and their transformations,
and the VM takes care of running everything for you.

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
