//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { primitive, assertType, stream, Stream } = furipota;
  const { compact } = require('./utils')(furipota);
  const childProcess = require('child_process');

  return {
    run(vm, command, _) {
      return primitive((vm, args, options) => {
        assertType('OS.run <command> _', 'Text', command);
        assertType('OS.run _ <args>', 'Vector', args);
        if ('working-directory' in options) {
          assertType('OS.run _ _ working-directory: <X>', 'Text', options['working-directory']);
        }
        if ('environment' in options) {
          assertType('OS.run _ _ environment: <X>', 'Record', options.environment);
        }
        if ('detached' in options) {
          assertType('OS.run _ _ detached: <X>', 'Boolean', options.detached);
        }
        if ('user-id' in options) {
          assertType('OS.run _ _ user-id: <X>', 'Number', options['user-id']);
        }
        if ('group-id' in options) {
          assertType('OS.run _ _ group-id: <X>', 'Number', options['group-id']);
        }
        if ('encoding' in options) {
          assertType('OS.run _ _ encoding: <X>', 'Text', options.encoding);
        }

        return stream(async (producer) => {
          const child = childProcess.spawn(command, args, compact({
            cwd: options['working-directory'],
            env: options.environment,
            uid: options['user-id'],
            gid: options['group-id']
          }));
          const encoding = options.encoding != null ? options.encoding : 'utf8';

          const die = async (error) => {
            child.kill();
            await producer.pushError(error);
            await producer.close();
          }

          child.stdout.on('data', async (chunk) => {
            try {
              child.stdout.pause();
              child.stderr.pause();
              await producer.pushValue(chunk.toString(encoding));
              child.stdout.resume();
              child.stderr.resume();
            } catch (error) {
              await die(error);
            }
          });

          child.stderr.on('data', async (chunk) => {
            try {
              child.stdout.pause();
              child.stderr.pause();
              await producer.pushError(chunk.toString(encoding));
              child.stdout.resume();
              child.stderr.resume();
            } catch (error) {
              await die(error);
            }
          });

          child.on('close', async (code) => {
            if (code !== 0) {
              await producer.pushError(`${command} exited with code ${code}`);
            }
            await producer.close();
          });

          child.on('error', async (error) => {
            await producer.pushError(error);
            await producer.close();
          })
        });
      });
    }
  }
};
