import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, Vector3, HemisphericLight, MeshBuilder, Color3, FreeCamera, ActionManager, ExecuteCodeAction, SceneLoader, Camera, Light, Animation } from "@babylonjs/core";
import "@babylonjs/loaders/OBJ"

class App {
    // Initialization
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _hasCarMoved = false;
    private _delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms)); // Delay

    // Create canvas
    private _createCanvas(): HTMLCanvasElement {
        var canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "canvas";
        document.body.append(canvas); // Add the canvas into the HTML body
        return canvas
    }

    // Create scene
    private _createScene(canvas: HTMLCanvasElement, engine: Engine): Scene {
        const scene = new Scene(engine);

        // Create ground
        const ground = MeshBuilder.CreateGround('ground', { height: 301, width: 100 }, scene);

        // Set up the overarching camera
        const overarchCam = function(): Camera {
            const camera = new FreeCamera('overarchCam', new Vector3(100, 150, -170), scene);
            camera.setTarget(Vector3.Zero());
            camera.attachControl(canvas, false);
            return camera;
        }();
        var carCam: Camera;

        // Set up light
        var light = new HemisphericLight("light", new Vector3(0,100,0), scene);
        light.diffuse = new Color3(1, 1, 1);

        // Load house object
        SceneLoader.LoadAssetContainer('./assets/house/', 'house.obj', scene, function(container) {
            container.meshes.forEach((value, index) => { // Set the position of all the meshes and scale them down for the scene
                value.position = new Vector3(0, 0, 100);
                value.scaling = new Vector3(0.1, 0.1, 0.1);
            })
            container.addAllToScene();
        });

        // Load car object
        SceneLoader.LoadAssetContainer('./assets/car/', 'copy-of-lamborghini-aventador.obj', scene, (container) => {
            const seatMesh = container.meshes.filter((value) => value.name === 'mesh_mm2')[0]; // Filter out "mesh_mm2", which is the interior chair
            container.meshes.forEach((mesh) => {
                if (mesh != seatMesh) {
                    /// Set each mesh to be a child of seat, unifying the meshes
                    mesh.parent = seatMesh;
                }

                /// Set action to every mesh. When the any of the car is clicked, it will change the camera drive the car forward.
                mesh.actionManager = new ActionManager(scene);
                mesh.actionManager.registerAction(
                    new ExecuteCodeAction(ActionManager.OnPickTrigger, async (meshEvent) => {
                        if (!this._hasCarMoved) {
                            await this._delay(500); // A short delay
                            this._hasCarMoved = true; // Update car status, so it won't be repeated

                            // Change camera to carCam
                            overarchCam.detachControl();
                            carCam = new FreeCamera('carCam', new Vector3(1.5, 4.5, -100), scene);
                            carCam.attachControl(canvas, false);
                            scene.activeCamera = carCam;

                            // Animations for moving both car and camera
                            Animation.CreateAndStartAnimation('movecar', seatMesh, 'position', 30, 100, seatMesh.position, seatMesh.position.add(new Vector3(0, 0, 150)), Animation.ANIMATIONLOOPMODE_CONSTANT);
                            Animation.CreateAndStartAnimation('movecamera', carCam, 'position', 30, 100, carCam.position, carCam.position.add(new Vector3(0, 0, 150)), Animation.ANIMATIONLOOPMODE_CONSTANT, null, async () => {
                                /// After the car has moved to the desired destination. The car will be stopped and the camera will be switched back to overarchCam (view from top).
                                await this._delay(500); // A short delay

                                // Change camera back to overarchCam with the new position
                                carCam.detachControl();
                                overarchCam.position = new Vector3(25, 50, 0);
                                overarchCam.attachControl(canvas, false);
                                scene.activeCamera = overarchCam;
                            });

                        }
                    })
                );
            })
            // Set initial position of the car
            seatMesh.position = new Vector3(0, 0, -100);
            seatMesh.scaling = new Vector3(4, 4, 4);
            seatMesh.rotation = new Vector3(0, 1.55, 0);
            container.addAllToScene();
        });
        return scene;

    }

    // Constructor
    constructor() {
        // Create canvas
        this._canvas = this._createCanvas();

        // Init babylon scene and engine
        this._engine = new Engine(this._canvas, true);
        this._scene = this._createScene(this._canvas, this._engine);

        // Hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Ctrl+Alt+Shift+I
            if (ev.ctrlKey && ev.altKey && ev.shiftKey && ev.key === 'I') {
                if (this._scene.debugLayer.isVisible()) {
                    this._scene.debugLayer.hide();
                } else {
                    this._scene.debugLayer.show();
                }
            }
        });

        // Run the main render loop
        this._engine.runRenderLoop(() => {
            this._scene.render();
        });
    }
}

// Entry point
new App();
