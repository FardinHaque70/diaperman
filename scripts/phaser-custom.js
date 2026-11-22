// Slim Phaser 3.80.1 build for DiaperMan: only the parts the game uses.
// Based on Phaser's own src/phaser-core.js, plus Arcade physics and the
// game objects we create (containers, shapes, tile sprites, particles).
// Built by scripts/build-phaser.mjs into vendor/phaser-diaperman-3.80.1.min.js.
/* eslint-disable */
require('phaser/src/polyfills/requestVideoFrame');

var CONST = require('phaser/src/const');
var Extend = require('phaser/src/utils/object/Extend');

var Phaser = {
    Animations: require('phaser/src/animations'),
    BlendModes: require('phaser/src/renderer/BlendModes'),
    Cache: require('phaser/src/cache'),
    Cameras: { Scene2D: require('phaser/src/cameras/2d') },
    Core: require('phaser/src/core'),
    Class: require('phaser/src/utils/Class'),
    Data: require('phaser/src/data'),
    Display: { Masks: require('phaser/src/display/mask') },
    Events: require('phaser/src/events'),
    Game: require('phaser/src/core/Game'),
    GameObjects: {
        DisplayList: require('phaser/src/gameobjects/DisplayList'),
        GameObjectCreator: require('phaser/src/gameobjects/GameObjectCreator'),
        GameObjectFactory: require('phaser/src/gameobjects/GameObjectFactory'),
        UpdateList: require('phaser/src/gameobjects/UpdateList'),
        Components: require('phaser/src/gameobjects/components'),
        BuildGameObject: require('phaser/src/gameobjects/BuildGameObject'),
        GameObject: require('phaser/src/gameobjects/GameObject'),
        Container: require('phaser/src/gameobjects/container/Container'),
        Graphics: require('phaser/src/gameobjects/graphics/Graphics.js'),
        Image: require('phaser/src/gameobjects/image/Image'),
        Sprite: require('phaser/src/gameobjects/sprite/Sprite'),
        Text: require('phaser/src/gameobjects/text/Text'),
        TileSprite: require('phaser/src/gameobjects/tilesprite/TileSprite'),
        Rectangle: require('phaser/src/gameobjects/shape/rectangle/Rectangle'),
        Arc: require('phaser/src/gameobjects/shape/arc/Arc'),
        Particles: require('phaser/src/gameobjects/particles'),
        Factories: {
            Container: require('phaser/src/gameobjects/container/ContainerFactory'),
            Graphics: require('phaser/src/gameobjects/graphics/GraphicsFactory'),
            Image: require('phaser/src/gameobjects/image/ImageFactory'),
            Sprite: require('phaser/src/gameobjects/sprite/SpriteFactory'),
            Text: require('phaser/src/gameobjects/text/TextFactory'),
            TileSprite: require('phaser/src/gameobjects/tilesprite/TileSpriteFactory'),
            Rectangle: require('phaser/src/gameobjects/shape/rectangle/RectangleFactory'),
            Arc: require('phaser/src/gameobjects/shape/arc/ArcFactory'),
            Particles: require('phaser/src/gameobjects/particles/ParticleEmitterFactory')
        },
        Creators: {
            Graphics: require('phaser/src/gameobjects/graphics/GraphicsCreator')
        }
    },
    Input: require('phaser/src/input'),
    Loader: {
        File: require('phaser/src/loader/File'),
        FileTypesManager: require('phaser/src/loader/FileTypesManager'),
        LoaderPlugin: require('phaser/src/loader/LoaderPlugin')
    },
    Math: {
        Between: require('phaser/src/math/Between'),
        DegToRad: require('phaser/src/math/DegToRad'),
        FloatBetween: require('phaser/src/math/FloatBetween'),
        RadToDeg: require('phaser/src/math/RadToDeg'),
        Vector2: require('phaser/src/math/Vector2')
    },
    Physics: { Arcade: require('phaser/src/physics/arcade') },
    Plugins: require('phaser/src/plugins'),
    Renderer: require('phaser/src/renderer'),
    Scale: require('phaser/src/scale'),
    ScaleModes: require('phaser/src/renderer/ScaleModes'),
    Scene: require('phaser/src/scene/Scene'),
    Scenes: require('phaser/src/scene'),
    Structs: require('phaser/src/structs'),
    Textures: require('phaser/src/textures'),
    Time: require('phaser/src/time'),
    Tweens: require('phaser/src/tweens'),
    Utils: { Array: require('phaser/src/utils/array') }
};

Phaser = Extend(false, Phaser, CONST);
module.exports = Phaser;
window.Phaser = Phaser;
