# furipota

> **NOTE**  
> This project is in super early stages of development and should not be used in production.

furipota (short for "Deep Fried Potatoes" or "(discrete) Functional Reactive
Programming Tasks") is a discrete FRP DSL for describing better build pipelines.
You define a closed system of discrete input streams and their transformations,
and the VM takes care of running everything for you.

Because the system is described as a sereies of discrete streams, things like
"watching a file for changes" are naturally supported, whereas one-off tasks are
just a stream with a single item. This also allows the whole system to run as a
daemon, reducing the overhead of starting new processes.

The system is implemented on top of Node, with JavaScript as an extension
language. Of course, any language that compiles to JavaScript can be used, the
only requirement is for the entrypoint to be a module parameterised over a
furipota VM instance, i.e.:

```js
module.exports = function(furipota) {
  return furipota.module('plugin:myPlugin', null, {
    hello(vm, arg, options) {
      return "hello " + arg;
    }
   });
}
```

You can then use it by requiring the plugin:

```ruby
%furipota/1

import plugin "./my-plugin.js" as Plugin

define hello = Plugin.hello "world"
``` 


## Licence

furipota is copyright (c) Quildreen Motta, and released under MIT.
