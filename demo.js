// TO DO:
// Add animations
// Add procedural generation:
//      0. Mix and match multiple body parts and pick from color palette
//		1. Generate in between 2 sprites (This should be good but not sure how animations will work. Should be the same)
//      2. Deform base sprite (Would animation still work ?)
//      3. Generate from zero ? (Will look the worst)
let camera, scene, renderer;
let gui;
let mapStart, mapEnd, mapBackground;
const frustumSize = 1000.0;


/**
 * Input is an object with: {
 * 		heads : []
 * 		legs : []
 * 		arms : []
 * 		necks : []
 * 	}
 * 
 */
// function BagRandomizer(sprites) {
// 	const heads = sprites.heads;
// 	const legs = sprites.legs;
// 	const arms = sprites.arms;
// 	const necks = sprites.necks;
	
// 	const randomizerLoadedTexture = {
// 		heads:[], legs:[], arms:[], necks:[]
// 	};
	
// 	// create sprites
// 	const textureLoader = new THREE.TextureLoader();

// 	if (heads) {
// 		for(let tex = 0 ; i < heads.length ; i += 1 ) {
// 			const texture = textureLoader.load(heads[i], () => { randomizerLoadedTexture.heads.push(texture); });
// 		}
// 	}
	
// 	if (legs) {
// 		for(let tex = 0 ; i < legs.length ; i += 1 ) {
// 			const texture = textureLoader.load(legs[i], () => { randomizerLoadedTexture.legs.push(texture); });
// 		}
// 	}
	
// 	if (arms) {
// 		for(let tex = 0 ; i < arms.length ; i += 1 ) {
// 			const texture = textureLoader.load(arms[i], () => { randomizerLoadedTexture.arms.push(texture); });
// 		}
// 	}
	
// 	if (necks) {
// 		for(let tex = 0 ; i < necks.length ; i += 1 ) {
// 			const texture = textureLoader.load(necks[i], () => { randomizerLoadedTexture.necks.push(texture); });
// 		}
// 	}
// };

function createThreePointMesh(x,y,z,size) {
	let geometry = new THREE.Geometry();
	geometry.vertices.push(new THREE.Vector3(x,y,z ) );	
	let material = new THREE.PointsMaterial( { size:size,  color: 0xffeeff, alphaTest: 0.0, transparent: false } );
	material.color.setHSL( 1.0, 0.3, 0.7 );
	
	var particles = new THREE.Points( geometry,material );
	return particles;
}
function CreateSpriteMesh(texture, x, y, scaleX, scaleY){
	// const planeGeom = new THREE.PlaneGeometry(1,1);
	const material = new THREE.SpriteMaterial( { map: texture, color: 0xfeefff, fog: false } );
	const sprite = new THREE.Sprite( material );
	
	sprite.scale.set( scaleX,scaleY, 1.0 );
	sprite.position.set( x, y, -1.0 );
	return sprite;
};

class SpriteLink {
	constructor(parent, child , pos, scale, group) {
		this.name = name;
		this.pos = pos;
		this.scale = scale;
		this.mesh = createThreePointMesh(pos[0],pos[1],0,scale);
		if (group) {
			group.add(this.mesh);
		}
	};

	Move(x,y) {
		this.pos = [x,y];
		this.mesh.geometry.vertices[0].set(x,y,this.mesh.geometry.vertices[0].z);
		this.mesh.geometry.verticesNeedUpdate = true;
	};
};


class Sprite {
	constructor(name, texture, pos, scale, rotZ, parentSprite) {
		this.name = name ? name : "";
		this.texture = texture ? texture : undefined;
		this.scale =  scale ? scale : [1,1,0];
		this.pos = pos ? pos : [0,0,0];
		this.renderable = CreateSpriteMesh(texture,this.pos[0],this.pos[1],this.scale[0],this.scale[1]);;
		this.rotationZ = rotZ ? rotZ : 0;
		this.children = {};

		if (parentSprite) {
			this.renderGroup = parentSprite.renderGroup;
			this.parentSprite = parentSprite;
			this.renderGroup.add(this.renderable);
			parentSprite.AddChild(this, pos);
		} else {
			this.renderGroup = new THREE.Group();
			this.parentSprite = undefined;
			this.renderGroup.add(this.renderable);
			scene.add(this.renderGroup);
		}		
	};

	AddChild(child, fixPoint) {
		let linkPos = (this.renderable.position.clone().sub(child.renderable.position)).normalize();
		let length = this.renderable.position.clone().sub(child.renderable.position).length();
		linkPos.multiplyScalar(length / 2);
		let spriteLink = new SpriteLink(this,child,[fixPoint[0] + linkPos.x,fixPoint[1] + linkPos.y] ,0.02,this.renderGroup);
		this.children[child.name] = {sprite:child,link:spriteLink};
	};

};

/**
 * 
 * @param {*} headTexture 
 * @param {*} bodyTexture
 * TODO: 1. Add scale to each part
 * 		 2. Add configurable attachment points using scale
 * 		 3. Add automatic placement of attachment points based on 2 sprite's positions 
 *  
 */
function Character(headTexture, bodyTexture) {
	this.pos = [0,0];

	this.body = new Sprite("Body", bodyTexture, [0,-64],[128,128], 0); 
	this.head = new Sprite("Head", headTexture, [0,64],[128,128], 0,this.body); 
	this.leftLeg = new Sprite("Legs_Left", bodyTexture, [-32,-192],[32,128], 0, this.body); 
	this.rightLeg = new Sprite("Legs_Right", bodyTexture, [32,-192],[32,128], 0, this.body); 
	this.leftArm = new Sprite("Arm_Left", bodyTexture, [-128,-64],[128,32], 0, this.body); 
	this.rightArm = new Sprite("Arm_Right", bodyTexture, [128,-64],[128,32], 0, this.body); 
	
	this.spriteGroup = this.head.renderGroup;

	this.Move = function(x,y) {
		this.pos = [x,y];
		this.spriteGroup.position.set(x,y,0);
		this.spriteGroup.needsUpdate = true;
	};

	return this;
}

init();
animate();
function init() {
	gui = new dat.GUI();
	const width = window.innerWidth;
	const height = window.innerHeight;
	const aspect = width / height;
	camera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 1, 2000 );			
	camera.position.z = 1;
	scene = new THREE.Scene();
	
	// renderer
	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor(new THREE.Color(0.5,0.5,0.5));
	document.body.appendChild( renderer.domElement );
	
	// create sprites
	const textureLoader = new THREE.TextureLoader();
	mapStart = textureLoader.load( "Textures/Circle.png");
	mapEnd = textureLoader.load( "Textures/Square.png");
	mapBackground = textureLoader.load( "Textures/CitySkyline01.jpg" );
	
	scene.background = mapBackground;
	
	let charc = new Character(mapStart,mapEnd);
	charc.Move(-300,0);
	
	let guiChar = gui.addFolder("Character");
	guiChar.add( charc.spriteGroup.position, "x").onChange( function(x) {
		const pos = charc.spriteGroup.position;
		charc.Move(x,pos.y);
	} );
	guiChar.add( charc.spriteGroup.position, "y").onChange( function(y) {
		const pos = charc.spriteGroup.position;
		charc.Move(pos.x,y);
	} );
	
	let guiHead = gui.addFolder("Head");
	let posHead = {x:charc.body.children.Head.link.pos[0], y:charc.body.children.Head.link.pos[1]};
	guiHead.add( posHead, "x").onChange( function(x) {
		let posY = charc.head.renderable.position.y;
		let posX = charc.head.renderable.position.x;  
		let xDelta = (x - charc.body.children.Head.link.pos[0]);
		charc.body.children.Head.link.Move(x,posHead.y);
		charc.head.renderable.position.set(posX + xDelta, posY, -1);
	} );
	guiHead.add( posHead, "y").onChange( function(y) {
		let posY = charc.head.renderable.position.y;
		let posX = charc.head.renderable.position.x;  
		let yDelta = (y - charc.body.children.Head.link.pos[1]);

		charc.body.children.Head.link.Move(posHead.x,y);
		charc.head.renderable.position.set(posX, posY + yDelta, -1);
	} );

	//resize event
	window.addEventListener( 'resize', onWindowResize, false );
}

function onWindowResize() {
	const width = window.innerWidth;
	const height = window.innerHeight;
	const aspect = window.innerWidth / window.innerHeight;
	camera.left   = - frustumSize * aspect / 2;
	camera.right  =   frustumSize * aspect / 2;
	camera.top    =   frustumSize / 2;
	camera.bottom = - frustumSize / 2;
	camera.updateProjectionMatrix();


	renderer.setSize( width, height );
}

function animate() {
	requestAnimationFrame( animate );
	render();
}
function render() {
	renderer.render( scene, camera );
}