# FuriPota (フリポタ)  [![Build Status](https://travis-ci.org/origamitower/furipota.svg?branch=master)](https://travis-ci.org/origamitower/furipota)

<img src="https://raw.githubusercontent.com/origamitower/furipota/master/.github/furipota.png" alt="furipota logo" align="left">


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

[There's a vague roadmap here](https://paper.dropbox.com/doc/oqVRBR64ieA3GUXGXByh8).



## Licence

furipota is copyright (c) Quildreen Motta, and released under MIT.
