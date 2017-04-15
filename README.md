# furipota

> **NOTE**  
> This is a highly experimental project and if you use it in
> production **kittens will turn into people**.
> No-one would ever want that to happen, right?

furipota (short for "Deep Fried Potatoes" or "(discrete) Functional Reactive
Programming Tasks") is a discrete FRP DSL for describing better build pipelines.
You define a closed system of discrete input streams and their transformations,
and the VM takes care of running everything for you.


## Getting started

Install it with npm:

    $ npm install -g origamitower/furipota

Create a `build.frp` file:

    %furipota/1

    import core "prelude"

    export define hello-world =
      # Says "Hello, world"
      from-vector ["Hello", ", ", "world"]
        |> display

Run the build pipeline:

    furipota run hello-world

Check the `examples/` folder and the `docs/` folder for more stuff.


## Licence

furipota is copyright (c) Quildreen Motta, and released under MIT.
