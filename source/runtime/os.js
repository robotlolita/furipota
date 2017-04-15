//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { tagged, primitive, assertType, stream, Stream, getType } = furipota;
  const { compact } = require('./utils')(furipota);
  const childProcess = require('child_process');

  return {
    run(vm, command, _) {
      return primitive((vm, args, options) => {
        assertType('OS.run <command> _', '^Path', command);
        assertType('OS.run _ <args>', 'Vector', args);
        if ('working-directory' in options) {
          assertType('OS.run _ _ working-directory: <X>', '^Path', options['working-directory']);
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

        const theArgs = args.map(x => {
          if (getType(x) === '^Path') {
            return x.value._fullpath;
          } else {
            return x;
          }
        });

        return stream(async (producer) => {
          const child = childProcess.spawn(command.value._fullpath, theArgs, compact({
            cwd: options['working-directory'] ? options['working-directory'].value._fullpath : null,
            env: options.environment,
            uid: options['user-id'],
            gid: options['group-id']
          }));
          const encoding = options.encoding != null ? options.encoding : 'utf8';

          const die = async (error) => {
            child.kill();
            await producer.pushError(tagged('OS-run-error', error));
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
              await producer.pushError(tagged('OS-run-stderr', chunk.toString(encoding)));
              child.stdout.resume();
              child.stderr.resume();
            } catch (error) {
              await die(error);
            }
          });

          child.on('close', async (code) => {
            if (code !== 0) {
              await producer.pushError(tagged('OS-run-exit-code', code));
            }
            await producer.close();
          });

          child.on('error', async (error) => {
            await producer.pushError(tagged('OS-run-error', error));
            await producer.close();
          })
        });
      });
    }
  }
};
