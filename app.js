import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader' 
import GUI from 'lil-gui'
import gsap from 'gsap'
import fragmentShader from './shaders/fragment.glsl'
import vertexShader from './shaders/vertex.glsl'
 
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass'
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass'
import {GlitchPass} from 'three/examples/jsm/postprocessing/GlitchPass'

import one from './one.jpg'
import two from './two.jpg'
import texture from './mask.png'

import { createNoise2D } from 'simplex-noise'
const noise2D = createNoise2D()

class Point {
	constructor(x,y, mesh, index) {
		this.position = new THREE.Vector2(x,y)
		this.originalPos = new THREE.Vector2(x,y)
		this.originalMehs = mesh
		this.index = index

		this.originalMehx = mesh.position.x


		this.mesh = new THREE.Mesh(
			new THREE.SphereGeometry(0.05, 10, 10),
			new THREE.MeshBasicMaterial({color: 0x00ff00})
		)
	}

	update(mouse) {

		let mouseForce = this.originalPos.clone().sub(mouse)
		let distance = mouseForce.length()
		let forceFactor = 1/Math.max(distance, 0.2)
		let positionToGo = this.originalPos.clone().sub(mouseForce.normalize().multiplyScalar(-distance * 0.2 * forceFactor))
		
		
		this.position.lerp(positionToGo, 0.1)


		this.mesh.position.x = this.position.x
		this.mesh.position.y = this.position.y

		let posArray = this.originalMehs.geometry.attributes.position.array
		posArray[this.index * 3] = this.position.x - this.originalMehx
		posArray[this.index * 3 + 1] = this.position.y
		this.originalMehs.geometry.attributes.position.needsUpdate = true 


	}
}

export default class Sketch {
	constructor(options) {
		
		this.scene = new THREE.Scene()
		
		this.container = options.dom
		
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		
		
		// // for renderer { antialias: true }
		this.renderer = new THREE.WebGLRenderer({ antialias: true })
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height)
		this.renderer.setSize(this.width ,this.height )
		this.renderer.setClearColor(0x000000, 1)
		this.renderer.useLegacyLights = true
		this.renderer.outputEncoding = THREE.sRGBEncoding
 

		 
		this.renderer.setSize( window.innerWidth, window.innerHeight )

		this.container.appendChild(this.renderer.domElement)
 


		this.camera = new THREE.PerspectiveCamera( 70,
			 this.width / this.height,
			 0.01,
			 10
		)
 
		this.camera.position.set(0, 0, 2) 
		this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.time = 0
		this.screenSpaceWidth = Math.tan(this.camera.fov * Math.PI / 180 / 2 ) * this.camera.position.z * this.camera.aspect

		this.dracoLoader = new DRACOLoader()
		this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
		this.gltf = new GLTFLoader()
		this.gltf.setDRACOLoader(this.dracoLoader)
		
		this.raycaster = new THREE.Raycaster()
		this.mouse = new THREE.Vector2()

		this.isPlaying = true

		this.addObjects()		 
		this.setupPoints()
		this.resize()
		this.render()
		this.setupResize()
		this.settings()
		this.mouseEvents()
 
	}
	setupPoints() {
		this.points = []
		// for (let i = 0; i < 4; i++) {
		// 	let x = Math.random() * 2 - 1
		// 	let y = Math.random() * 2 - 1
		// 	let p = new Point(x,y)

		// 	this.points.push(p)
		// 	this.scene.add(p.mesh)
			
		// }
		this.meshes.forEach(m => {
			let posArray = m.geometry.attributes.position.array

			for (let i = 0; i < posArray.length; i += 3) {
				let x = posArray[i] + m.position.x
				let y = posArray[i + 1]
				let r1 = 0.3 * noise2D(x,y)
				let r2 = 0.3 * noise2D(x,y)

				let p = new Point( x + r1,y + r2,m, i /3  )
				this.points.push(p)
				this.scene.add(p.mesh)

				
			}
		})
	}
	mouseEvents() {
		this.testMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(10, 10),
			new THREE.MeshBasicMaterial({color: 0xff0000})
		)
		this.debugmesh = new THREE.Mesh(
			new THREE.SphereGeometry(.1, 10, 10),
			new THREE.MeshBasicMaterial({color: 0xff0000, wireframe: true})
		)
		window.addEventListener('mousemove', (e) => {
			this.mouse.x = (e.clientX / this.width) * 2 - 1
			this.mouse.y = - (e.clientY / this.height) * 2 + 1

			this.raycaster.setFromCamera(this.mouse, this.camera)

			const intersects = this.raycaster.intersectObjects([this.testMesh]) 

			if(intersects.length > 0) {
				this.mouse.x = intersects[0].point.x
				this.mouse.y = intersects[0].point.y
				this.debugmesh.position.copy(intersects[0].point)

			}



		}, false)
		// this.scene.add(this.testMesh)
		this.scene.add(this.debugmesh)

	}
	settings() {
		let that = this
		this.settings = {
			progress: 0
		}
		this.gui = new GUI()
		this.gui.add(this.settings, 'progress', -1, 1, 0.01).onChange(() => {
			this.meshes.forEach(m => {
				m.position.x = m.userData.position + this.settings.progress * 10
				m.material.uniforms.progress.value = m.position.x / 2

			})
		})
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this))
	}

	resize() {
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		this.renderer.setSize(this.width, this.height)
		this.camera.aspect = this.width / this.height


		this.imageAspect = 853/1280
		let a1, a2
		if(this.height / this.width > this.imageAspect) {
			a1 = (this.width / this.height) * this.imageAspect
			a2 = 1
		} else {
			a1 = 1
			a2 = (this.height / this.width) / this.imageAspect
		} 


		// this.material.uniforms.resolution.value.x = this.width
		// this.material.uniforms.resolution.value.y = this.height
		// this.material.uniforms.resolution.value.z = a1
		// this.material.uniforms.resolution.value.w = a2

		this.camera.updateProjectionMatrix()



	}


	addObjects() {
		let that = this
		let uTexture = new THREE.TextureLoader().load(texture)
		this.material = new THREE.ShaderMaterial({
			extensions: {
				derivatives: '#extension GL_OES_standard_derivatives : enable'
			},
			side: THREE.DoubleSide,
			uniforms: {
				time: {value: 0},
				resolution: {value: new THREE.Vector4()},
				uTexture: {value: uTexture},
				progress: {value: 0},
				resolution: {value: new THREE.Vector2(this.width, this.height)}
			},
			vertexShader,
			fragmentShader
		})
		
		this.geometry = new THREE.PlaneGeometry(1,1,10,10)
		// this.plane = new THREE.Mesh(this.geometry, this.material)
 
		// this.scene.add(this.plane)
		this.meshes = []
		for (let i = -2; i < 3; i++) {
			let geometry = new THREE.PlaneGeometry(1,1,1,1)
			let m  = this.material.clone()
			m.uniforms.uTexture.value = uTexture
			m.uniforms.progress.value = i / 2

			let p = new THREE.Mesh(geometry, m)
			p.position.x = i

			p.userData.position = i

			this.meshes.push(p)
			this.scene.add(p)
		}

	}



	addLights() {
		const light1 = new THREE.AmbientLight(0xeeeeee, 0.5)
		this.scene.add(light1)
	
	
		const light2 = new THREE.DirectionalLight(0xeeeeee, 0.5)
		light2.position.set(0.5,0,0.866)
		this.scene.add(light2)
	}

	stop() {
		this.isPlaying = false
	}

	play() {
		if(!this.isPlaying) {
			this.isPlaying = true
			this.render()
		}
	}

	updateGeo() {
		// let posArray = this.geometry.attributes.position.array

		// for (let i = 0; i < posArray.length; i += 3) {
		// 	let x = posArray[i]
		// 	let y = posArray[i + 1]
		// 	let z = posArray[i + 2]

		// 	let noise = 0.1 * Math.sin(y * 2 + this.time) * 0.2
		// 	// posArray[i] = x + noise

			
		// }

		// this.geometry.attributes.position.needsUpdate = true
	}

	render() {
		if(!this.isPlaying) return
		this.time += 0.05
		this.material.uniforms.time.value = this.time
		 
		//this.renderer.setRenderTarget(this.renderTarget)
		this.renderer.render(this.scene, this.camera)
		//this.renderer.setRenderTarget(null)
		this.updateGeo()
		this.points.forEach(p => {
			p.update(this.mouse)
		})
		requestAnimationFrame(this.render.bind(this))
	}
 
}
new Sketch({
	dom: document.getElementById('container')
})
 