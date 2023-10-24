uniform float time;
uniform float progress;
uniform sampler2D uTexture;
uniform vec2 resolution;
varying vec2 vUv;
varying vec3 vPosition;
float PI = 3.1415926;
void main() {

	vec2 normalizedUV = gl_FragCoord.xy / resolution.xy;

	float aspect = resolution.x/resolution.y;
	vec2 scale;
	if(aspect < 1.) {
		// normalizedUV.x *= aspect;
		scale = vec2(1., 1. / aspect);
	} else {
		// normalizedUV.y /= aspect;
		scale = vec2(aspect, 1.);

	}
	normalizedUV = (normalizedUV - vec2(0.5)) * scale * 1.5 + vec2(.5);

	normalizedUV.x -= progress;
	// normalizedUV.y -= 1./aspect;



	vec4 color = texture2D(uTexture, normalizedUV);
 
	gl_FragColor = color;
}