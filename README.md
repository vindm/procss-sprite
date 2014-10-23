# Procss-sprite

[Procss](https://github.com/vindm/procss)-plugin for CSS sprites creating.

`Procss-sprite` uses `/* pross.sprite([options...]) */` comments
 to get only necessary images to be sprited, like this:
```css
.bg { background: url(image.png) /* procss.sprite() */; }
```

You can group images to specific sprites,
 by passing a sprite name as 1st argument to CSS sprite command, like this:
```css
.bg { background: url(image.png) /* procss.sprite(mysprite) */; }
```

You can define margins or a size of clear area around the image in sprite,
 by passing a valid css margin px value as 2nd argument to CSS sprite command, like this:
```css
.bg1 { background: url(image1.png) /* procss.sprite(mysprite, 10) */; }
.bg2 { background: url(image2.png) /* procss.sprite(, 10 10 10 10) */; }
```

`Procss-sprite` creates sprites with [Spriter](https://github.com/vindm/spriter),
 so it can restore and use existing sprites and 
 [other stuff](https://github.com/vindm/spriter#Spriter) that `Spriter` can.
 
You can specify [Spriter config](https://github.com/vindm/spriter#how-to-use)
 depending on spriting image path and/or sprite name in `.procss.js` file.

Checkout [Configuration](https://github.com/vindm/procss-sprite#Configuration) for more info.

## Usage
   
Install with [npm](https://npmjs.org/package/procss):
```sh
$ [sudo] npm install procss procss-sprite --save
```

Input files
 
`./a.css`:
```css
.bg1 {
    background: url(image1.png) /* procss.sprite(mysprite) */;
}
```
`./b.css`:
```css
.bg2 {
    background-image: url(image2.png) /* procss.sprite(mysprite, 10 20) */;
}
```

Define the plugin in `./.procss.js` config file:
```js
module.exports = { plugins : [ 'procss-sprite' ] };
```

Run `Procss`:
```sh
$ procss '**/*.css'
```

`Procss-sprite` will generate `./sprites/mysprite.png` sprite and files

`./a.pro.css`:
```css
.bg1 {
    background: url(image1.png) /* procss.sprited(mysprite) */;
    background-image: url(sprites/mysprite.png) /*~*/;
    background-position: -2px -2px /*~*/;
    background-repeat: no-repeat /*~*/;
}
```
`./b.pro.css`:
```css
.bg2 {
    background-image: url(image2.png) /* procss.sprited(mysprite, 10 20) */;
    background-image: url(sprites/mysprite.png) /*~*/;
    background-position: -52px -10px /*~*/;
    background-repeat: no-repeat /*~*/;
}
```

As you can see, there are some comments that `Procss-sprite` has been added.
 It's need to allow you to use '?' mask as output option to override original input files
  and keep valid every already processed CSS rule on each `Procss` run.

Checkout more examples at
 [/test](https://github.com/vindm/procsss-sprite/blob/master/test) and
 [/example](https://github.com/vindm/procss-sprite/blob/master/example).

## Configuration

`Procss-sprite` creates spriting config for each parsed image, while collecting them from processing CSS files.

Default sprite config for all images is:
```js
{
    path : './sprites',
    name : 'common',
    ext : 'png',
    layout : 'smart',
    padding : 2,
    ifexists : 'create'
}
```

`Procss-sprite` will group images by unique configs and
 use these configs as `Spriter` configs with grouped images as `src` to create sprites.
 Checkout [Spriter configuration](https://github.com/vindm/spriter#configuration) for more info about `Spriter` config.

You can override default config for specific image by using CSS command `name` and `padding` arguments:
```css
.bg { background: url(image.png) /* procss.sprite(mysprite, 10 20) */; }
```

Also, you can use `.procss.js` file to specify `Procss-sprite` plugin config, to have full sprite configuration control:
```js
module.exports = {
    plugins : [ {
        plugin : 'procss-sprite',
        config : {...}
    } ]
};
```
Checkout [Procss configuration](https://github.com/vindm/procss#configuration)
 for more info about `.procss.js` config file.
 
You can use `Procss-sprite` config to specify `Spriter` configs by sprite names, defined in CSS commands.

You should use 'default' reserved name to define default sprite config that will be used
 for images with not defined CSS command sprite name or
 to be extended with config for images with specific sprite name.

For example, if you have `./.procss.js` config file like this:
```js
module.exports = {
    plugins : [ {
        plugin : 'procss-sprite',
        config : {
            'default' : { name : 'supersprite' },
            mysprite : { name : 'supersprite' }
        }
    } ]
};
```
and files:

`./a.css`
```css
.bg1 {
    background: url(image1.png) /* procss.sprite() */;
}
.bg2 {
    background: url(image2.png) /* procss.sprite(mysprite) */;
}
```
`./b.css`
```css
.bg3 {
    background: url(image3.png) /* procss.sprite(supersprite) */;
}
```
it will be only one sprite in result with config like the default `Spriter` one but with 'supersprite' as `name`.
  
Also, you can specify configs depending on spriting image path with `image_paths` wildcards: 
```js
module.exports = {
    plugins : [ {
        plugin : 'procss-sprite',
        config : [
            {
                image_paths : '**/*',
                config : {
                    'default' : { name : 'sprite' },
                    mysprite : { name : 'sprite' }
                }
            },
            {
                image_paths : [ '**/image1.png', '**/super/**/*.png' ],
                config : {
                    default : { name : 'supersprite' }
                }
            }
        ]
    } ]
};
```
Each matched config will be extended by the next one, so definition order is significant.

And, finally, you can specify different configs depending on processing file paths: 
```js
module.exports = [
    {
        file_paths : '**/*.css',
        plugins : [ {
            plugin : 'procss-sprite',
            config : {
                'default' : { name : 'sprite' },
                mysprite : { name : 'sprite' }
            }
        } ]
    },
    {
        file_paths : '**/super/**/*.css',
        plugins : [ {
            plugin : 'procss-sprite',
            config : [
                {
                    image_paths : [ '**/super/**/*.png' ],
                    config : {
                        mysprite : { name : 'supersprite' }
                    }
                }
            ]
        } ]
    },
    {
        file_paths : '**/not-for-spriting/**/*.css',
        plugins : []
    }
];
```

Checkout [Procss configuration](https://github.com/vindm/procss#configuration)
 for more info about `.procss.js` config file.
