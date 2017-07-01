Some questions you might have asked while looking at Furipota.


## Why do we need another building tool? Why not *(existing tool)*?

I wanted a build tool that had the following characteristics:

  - **Supported modular build rules**: I should be able to write build rules as components that I can share between projects.
  - **Supported parameterisation**: I should be able to parameterise build rules (functions or an equivalent. Note that while recursion is a nice bonus, unbounded recursion is not a requirement).
  - **Consistent language, with decent support for invoking native processes**. Being functional is a nice bonus, but not a requirement.
  - **Enforced (or at least encouraged) DETERMINISTIC builds**. That is, every time I run the build tool it should have a well defined start state AND reach the *same* end state by the end of the build. EVERY TIME. Fast builds are a nice bonus, but not a requirement.
  - **Provided a consistent model for defining *concurrent* and *continuous/reactive* rules**. That is, I should not only be able to combine rules concurrently, but I should be able to define rules that run every time a particular event of interest happens.
  - **Should be general purpose**: I'd really like to use the same build system for all platforms I work with. (it follows that any system meeting this requirement will be extensible)
  - **Using the system should take a reasonable amount of effort**: Ideally, this effort is almost non-existent. I don't want to build a new build system for every new project. At best I want to configure a couple of things.

Other things that are very interesting, but were not a core consideration:

  - **Capability security**: It'd be nice to be able to define exactly which features each component will have access to. That way I don't have to put full trust in every piece of code I add to the build system.
  - **Consistent caching**: It'd be nice to be able to define caching strategies for particular components in a way that they don't make the build non-deterministic. As it turns out, [caching is a very hard problem](https://twitter.com/robotlolita/status/853337901790355456).
  - **Totality & static analysis**: It'd be nice if the language used by the build system let me have all of this WITHOUT being turing-complete AND had tools for statically analysing the build rules for consistency/etc.

So, how well do existing build tools fit those characteristics? Unsurprisingly, not very well. (I'd probably still be writing this if they did because I like writing languages, but it'd be a hobby project, not a serious one).

Some examples:

  - [Make](https://www.gnu.org/software/make/): not modular, no parameterisation, inconsistent af, lol determinism, what is even concurrency? Oh. It does some rule execution optimisation. At the cost of correctness.
  - [tup](http://gittup.org/tup/index.html): modular, consistent, correct, efficient, some static analysis. Tup can be extended with Lua, but it's mostly designed for building C systems.
  - [SCons](http://scons.org/): modular, consistent, extensible (Python), low-effort for built-in platforms. 
  - [Nix](http://nixos.org/nix/manual/): doesn't really aim to solve the problem of actually compiling things, but other than that has some pretty neat ideas on putting pieces of software together at a higher level.
  - [Broccoli](https://github.com/broccolijs/broccoli): modular, consistent, extensible (JavaScript). Correctness and effort depends on each plugin, no built-in build features.

Other tools, like Grunt, Gulp, Jake, Cake, Rake, etc. are really just task runners, not build systems. In that sense, they're not very different from just having a bunch of shell scripts in a folder, and running them from your preferred terminal. That is: they *DO NOT* help in defining rules for how a software should be constructed that results in a correct build. They do not care.

While you can write your own build system on top of a task runner, given a sufficiently expressive language, the purpose of a build system is pretty much to avoid having to write your own. Build systems are difficult to write correctly, if you care about efficient AND deterministic/correct builds.

(This does not mean that task runners can't be useful, just that they solve different problems)


## Why write a new language? And why an interpreter?

Languages matter, in particular where their execution model and runtime characteristics is significantly different from existing alternatives. Interpreters are very easy to implement and maintain, while allowing better developer feedback/tooling. Furipota doesn't need much performance since most computation is *not* performed in the language.


## Why Node?

Reasonably fast startup time (with the base compiler, faster with Ignite), reasonable runtime efficiency (JIT optimisers), easy to load extension code at runtime, reasonably-sized ecosystem and tooling, easy to deploy/install.


