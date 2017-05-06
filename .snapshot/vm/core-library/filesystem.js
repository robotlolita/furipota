//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { nativeModule, native, nativeThunk, tagged, stream, textToPath, pathToText } = furipota.primitives;
  const fsw = require('../../wrappers/fs');
  const { compact } = require('../../utils');
  const fs = require('fs');
  const Maybe = require('folktale/data/maybe');


  return nativeModule('core:filesystem', {
    find:
    native('find', [['^Path'], {
        'base-directory?': '^Path',
        'silent?': 'Boolean',
        'strict?': 'Boolean',
        'match-directories?': 'Boolean',
        'ignore?': 'Vector',
        'follow-symlinks?': 'Boolean',
        'return-absolute-paths?': 'Boolean'
      }],
      'finds files with a glob pattern',
      (ctx, pattern, options) => {
        return stream(async (producer) => {
          try {
            const cwd = Maybe.fromNullable(options['base-directory']).map(pathToText).getOrElse(process.cwd());
            const files = await fsw.glob(pathToText(pattern), compact({
              cwd,
              silent: options.silent,
              strict: options.strict,
              nodir: !options['match-directories'],
              ignore: Maybe.fromNullable(options.ignore).map(x => x.map(pathToText)).getOrElse(null),
              follow: options['follow-symlinks'],
              absolute: options['return-absolute-paths']
            }));

            for (const file of files) {
              await producer.pushValue(textToPath(file));
            }
          
            await producer.close();
          } catch (error) {
            await producer.pushError(error);
            await producer.close();
          }
        });
      }
    ),

    'make-directory':
    native('make-directory', [['^Path'], { 'mode?': 'Number' }],
      'creates a path in a file system',
      (ctx, path, { mode }) => {
        return stream(async (producer) => {
          try {
            const made = await fsw.makeDirectory(pathToText(path), compact({ mode }));
            await producer.pushValue(Boolean(made));
            await producer.close();
          } catch (error) {
            await producer.pushError(error);
            await producer.close();
          }
        })
      }
    ),

    'remove':
    native('remove', [['^Path'], {}],
      'removes a path from the file system',
      (ctx, path, options) => {
        return stream(async (producer) => {
          try {
            await fsw.remove(pathToText(path), { disableGlob: true });
            await producer.close();
          } catch (error) {
            await producer.pushError(error);
            await producer.close();
          }
        })
      }
    ),

    'copy':
    native('copy', [['^Path'], { to: '^Path', 'overwrite?': 'Boolean' }],
      'copies a tree to another destination',
      (ctx, path, { to, overwrite }) => {
        return stream(async (producer) => {
          try {
            await fsw.copy(pathToText(path), pathToText(to), compact({ overwrite }));
            await producer.pushValue({ from: path, to });
            await producer.close();
          } catch (error) {
            await producer.pushError(error);
            await producer.close();
          }
        })
      }
    ),

    'list-directory':
    native('list-directory', [['^Path'], {}],
      'lists the immediate contents of a directory',
      (ctx, path, _options) => {
        return stream(async (producer) => {
          try {
            const files = fsw.listDirectory(pathToText(path));
            await producer.pushValue(files);
            await producer.close();
          } catch (error) {
            await producer.pushError(error);
            await producer.close();
          }
        });
      }
    ),

    'exists':
    native('exists', [['^Path'], {}],
      'checks if a path exists',
      (ctx, path, _options) => {
        return fs.existsSync(pathToText(path));
      }
    ),

    'read':
    native('read', [['^Path'], {
        'encoding?': '^Encoding',
        'mode?': 'Number',
        'start-at-byte?': 'Number',
        'end-at-byte?': 'Number'
      }],
      'reads the contents of a file in chunks',
      (ctx, path, options) => {
        return stream(async (producer) => {
          const data = fs.createReadStream(pathToText(path), compact({
            encoding: Maybe.fromNullable(options.encoding).map(x => x.value._).getOrElse(null),
            mode: options.mode,
            start: options['start-at-byte'],
            end: options['end-at-byte']
          }));
          
          data.on('close', () => {
            producer.close();
          });

          data.on('data', async (chunk) => {
            data.pause();
            await producer.pushValue(chunk);
            data.resume();
          });

          data.on('end', () => {
            producer.close();
          });

          data.on('error', async (error) => {
            data.pause();
            await producer.pushError(error);
            await producer.close();
          });
        });
      }
    ),

    'write':
    native('write', [['^Path', 'Stream'], {
        'default-encoding?': '^Encoding',
        'mode': 'Number',
        'start-at-byte': 'Number'
      }],
      'Writes data to a path',
      (ctx, path, sourceStream, options) => {
        return stream(async (producer) => {
          const output = fs.createWriteStream(pathToText(path), {
            defaultEncoding: Maybe.fromNullable(options['default-encoding']).map(x => x.value._).getOrElse(null),
            mode: options.mode,
            start: options['start-at-byte']
          });

          const die = async () => {
            output.end();
            await producer.close();
          };

          sourceStream.subscribe({
            Value: async (chunk) => {
              return new Promise((resolve, reject) => {
                if (!output.write(chunk)) {
                  output.once('drain', resolve);
                } else {
                  resolve();
                }
              });
            },

            Error: async (error) => {
              await producer.pushError(error);
              await die();
            },

            Close: async () => {
              await die();
            }
          });

          await sourceStream.run();
        });
      }
    ),

    'symbolic-link':
    native('symbolic-link', [['^Path'], { to: '^Path' }],
      'creates a symbolic link',
      (ctx, from, { to }) => {
        return stream(async (producer) => {
          try {
            await fsw.link(pathToText(to), pathToText(from));
            await producer.close();
          } catch (error) {
            await producer.pushError(error);
            await producer.close();
          }
        });
      }
    ),

    'unlink':
    native('unlink', [['^Path'], {}],
      'removes a symbolic link',
      (ctx, path, _options) => {
        return stream(async (producer) => {
          try {
            await fsw.unlink(pathToText(path));
            await producer.close();
          } catch (error) {
            await producer.pushError(error);
            await producer.close();
          }
        });
      }
    ),

    'Encoding': {
      'utf-8': nativeThunk('utf-8', 'an encoding for multibyte encoded Unicode characters', 
        (ctx) => tagged('Encoding', {_: 'utf8'})
      ),

      'ascii': nativeThunk('ascii', 'an encoding for 7-bit ASCII data only',
        (ctx) => tagged('Encoding', {_: 'ascii'})
      ),

      'utf-16-little-endian': nativeThunk('utf-16-little-endian', '2 or 4 bytes, little-endian encoded Unicode characters',
        (ctx) => tagged('Encoding', {_: 'utf16le'})
      ),

      'base64': nativeThunk('base64', 'an encoding in base 64',
        (ctx) => tagged('Encoding', {_: 'base64'})
      ),

      'latin1': nativeThunk('latin1', 'a way of encoding th Buffer into a one-byte encoded string',
        (ctx) => tagged('Encoding', {_: 'latin1'})
      ),

      'hex': nativeThunk('hex', 'encode each byte as two hexadecimal characters',
        (ctx) => tagged('Encoding', {_: 'hex'})
      )
    }
  });
};