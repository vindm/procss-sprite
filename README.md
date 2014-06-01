# Procss-sprite

[Procss](https://github.com/vindm/procss)-plugin for image spriting.

## Features

> * Process only specific urls, matched by `/* procss.sprite() */` comment

> * Can sprite multiple backgrounds urls

> * Can restore and use exists sprites

> * @todo

## Usage
   
Install with [npm](https://npmjs.org/package/procss):
```
    $ [sudo] npm install procss-sprite --save
```

Input file `a.css`:
```
.some-ico {
    background : url(some_small_image.png) /* procss.sprite() */;
}
.some-ico.svg {
    background : url(some_small_image.svg) /* procss.sprite() */;
}
```

Run `procss` with `procss-sprite` plugin:
```
    $ procss a.css -p path/to/procss-sprite
```

It will generate `./sprites/common.png` sprite and `a.pro.css` file:
```
.some-ico {
    background : url(some_image.png)/* procss.sprite(sum:34fc09432b7547b20fd9e7631b9d06ace53d997b) */;
    background-image: url(sprites/common.png) /*~~*/;
    background-position: -2px -2px /*~~*/;
    background-repeat: no-repeat /*~~*/;
}
.some-ico.svg {
    background : url(some_another_image.png); /* procss.sprite(sum:69bc2fdf75001c86a12b930f155d2ebbb4da498d) */;
    background-image: url(sprites/common.png) /*~~*/;
    background-position: -260px -2px /*~~*/;
    background-repeat: no-repeat /*~~*/;
}
```

Checkout more examples at
 [/example](https://github.com/vindm/procss/blob/master/example) and
 [/test](https://github.com/vindm/procss/blob/master/test).

## Configuration

`Procss-sprite` plugin config is an array of objects with image paths pattern
 and [Spriter](https://github.com/vindm/spriter#how-to-use) config.

You can use `.procss.js` file to predefine plugin configs by processing input filepaths like this:
```
{
    plugins : [
        {
            plugin : 'procss-sprite',
            config : [
                {
                    patterns : '**/*.png',
                    config : {
                        'default' : {
                            path : './sprited',
                            name : 'common',
                            ext : 'png',
                            layout : 'smart',
                            padding : 2,
                            ifexists : 'create',
                            cache_path : './.spriter.json'
                        }
                    }
                }
            ]
        }
    ]
}
```

Checkout 
* [Procss configuration](https://github.com/vindm/procss#configuration) for more info about `.procss.js` config file
* [Spriter usage](https://github.com/vindm/spriter#usage) to know more about `Spriter` config
