//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// Chapter 5: ColoredTriangle.js (c) 2012 matsuda  AND
// Chapter 4: RotatingTriangle_withButtons.js (c) 2012 matsuda
// became:
//
// BasicShapes.js  MODIFIED for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin
//		--converted from 2D to 4D (x,y,z,w) vertices
//		--extend to other attributes: color, surface normal, etc.
//		--demonstrate how to keep & use MULTIPLE colored shapes in just one
//			Vertex Buffer Object(VBO). 
//		--create several canonical 3D shapes borrowed from 'GLUT' library:
//		--Demonstrate how to make a 'stepped spiral' tri-strip,  and use it
//			to build a cylinder, sphere, and torus.
//
// Vertex shader program----------------------------------
var glsl = require("glslify");
var VSHADER_SOURCE = glsl.file("./shaders/vertexShader.vert");

// Fragment shader program----------------------------------
var FSHADER_SOURCE = glsl.file("./shaders/fragmentShader.frag");

// Global Variables
var ANGLE_STEP = 45.0;		// Rotation angle rate (degrees/second)
var floatsPerVertex = 7;	// # of Float32Array elements used for each vertex
													// (x,y,z,w)position + (r,g,b)color
													// Later, see if you can add:
													// (x,y,z) surface normal + (tx,ty) texture addr.

//globals for camera control
panAngle = 0;
tiltAngle = 0;
eyePosition = [-5, 0, 0.5];
cylVertsMulti = [];
boxRotate = 0;
var inverted = false;	//controls look inversion

//globals for mouse drag interaction
g_isDrag = false;											
g_xMclik = 0.0;													
g_yMclik = 0.0;
g_xMdragTot=0.0;
g_yMdragTot=0.0; 

function main() {
//==============================================================================
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // 
  var n = initVertexBuffer(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel 
	// unless the new Z value is closer to the eye than the old one..
//	gl.depthFunc(gl.LESS);			 // WebGL default setting: (default)
	gl.enable(gl.DEPTH_TEST); 	 
	 
//==============================================================================
// STEP 4:   REMOVE This "reversed-depth correction"
//       when you apply any of the 3D camera-lens transforms: 
//      (e.g. Matrix4 member functions 'perspective(), frustum(), ortho() ...)
//======================REVERSED-DEPTH Correction===============================

  //  b) reverse the usage of the depth-buffer's stored values, like this:
  gl.enable(gl.DEPTH_TEST); // enabled by default, but let's be SURE.
  gl.clearDepth(0.0);       // each time we 'clear' our depth buffer, set all
                            // pixel depths to 0.0  (1.0 is DEFAULT)
  gl.depthFunc(gl.GREATER); // draw a pixel only if its depth value is GREATER
                            // than the depth buffer's stored value.
                            // (gl.LESS is DEFAULT; reverse it!)
//=====================================================================

  // Get handle to graphics system's storage location of u_ModelMatrix
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) { 
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }
  // Create a local version of our model matrix in JavaScript 
  var modelMatrix = new Matrix4();
  
  // Create, init current rotation angle value in JavaScript
  var currentAngle = 0.0;

  var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  if (!u_MvpMatrix) { 
    console.log('Failed to get the storage location of u_MvpMatrix');
    return;
  }
  //camera controls
  document.addEventListener("keydown", (e) => {
	console.log(e.key)
    if(e.key === "w") {
		eyePosition[0] += 0.1*Math.cos(Math.PI*panAngle/180)*Math.cos(Math.PI*tiltAngle/180);
		eyePosition[1] += 0.1*Math.sin(-Math.PI*panAngle/180)*Math.cos(Math.PI*tiltAngle/180);
		eyePosition[2] += 0.1*Math.sin(Math.PI*tiltAngle/180);

	}
	if(e.key === "s") {
		eyePosition[0] -= 0.1*Math.cos(Math.PI*panAngle/180)*Math.cos(Math.PI*tiltAngle/180);
		eyePosition[1] -= 0.1*Math.sin(-Math.PI*panAngle/180)*Math.cos(Math.PI*tiltAngle/180);
		eyePosition[2] -= 0.1*Math.sin(Math.PI*tiltAngle/180);

	}
	if(e.key === "a") {
		if(!inverted) {
			eyePosition[0] += 0.1*Math.sin(Math.PI*panAngle/180)*Math.cos(Math.PI*tiltAngle/180);
			eyePosition[1] += 0.1*Math.cos(-Math.PI*panAngle/180)*Math.cos(Math.PI*tiltAngle/180);	
		}
		else {
			eyePosition[0] -= 0.1*Math.sin(Math.PI*panAngle/180)*Math.cos(Math.PI*tiltAngle/180);
			eyePosition[1] -= 0.1*Math.cos(-Math.PI*panAngle/180)*Math.cos(Math.PI*tiltAngle/180);
		}
	}
	if(e.key === "d") {
		if(!inverted) {
			eyePosition[0] -= 0.1*Math.sin(Math.PI*panAngle/180)*Math.cos(Math.PI*tiltAngle/180);
			eyePosition[1] -= 0.1*Math.cos(-Math.PI*panAngle/180)*Math.cos(Math.PI*tiltAngle/180);	
		}
		else {
			eyePosition[0] += 0.1*Math.sin(Math.PI*panAngle/180)*Math.cos(Math.PI*tiltAngle/180);
			eyePosition[1] += 0.1*Math.cos(-Math.PI*panAngle/180)*Math.cos(Math.PI*tiltAngle/180);
		}
	}
	if(e.key === "e") {
		if(!inverted) {
			eyePosition[0] -= 0.1*Math.cos(Math.PI*panAngle/180)*Math.sin(Math.PI*tiltAngle/180);
			eyePosition[1] -= 0.1*Math.sin(-Math.PI*panAngle/180)*Math.sin(Math.PI*tiltAngle/180);
			eyePosition[2] += 0.1*Math.cos(Math.PI*tiltAngle/180);
		}
		else {
			eyePosition[0] += 0.1*Math.cos(Math.PI*panAngle/180)*Math.sin(Math.PI*tiltAngle/180);
			eyePosition[1] += 0.1*Math.sin(-Math.PI*panAngle/180)*Math.sin(Math.PI*tiltAngle/180);
			eyePosition[2] -= 0.1*Math.cos(Math.PI*tiltAngle/180);
		}
	}
	if(e.key === "q") {
		if(!inverted) {
			eyePosition[0] += 0.1*Math.cos(Math.PI*panAngle/180)*Math.sin(Math.PI*tiltAngle/180);
			eyePosition[1] += 0.1*Math.sin(-Math.PI*panAngle/180)*Math.sin(Math.PI*tiltAngle/180);
			eyePosition[2] -= 0.1*Math.cos(Math.PI*tiltAngle/180);
		}
		else {
			eyePosition[0] -= 0.1*Math.cos(Math.PI*panAngle/180)*Math.sin(Math.PI*tiltAngle/180);
			eyePosition[1] -= 0.1*Math.sin(-Math.PI*panAngle/180)*Math.sin(Math.PI*tiltAngle/180);
			eyePosition[2] += 0.1*Math.cos(Math.PI*tiltAngle/180);
		}
	}
	if(e.key === "ArrowUp") {
		if(!inverted) {
			if(tiltAngle + 3 > 90) {
				panAngle = panAngle+=180;
				inverted = true;
				console.log("inverted?" + inverted)
			}
			else{
				tiltAngle += 1;
			}
		}
		if(inverted) {
			if(tiltAngle - 3 < - 90) {
				panAngle += 180;
				inverted = false;
				console.log("inverted?" + inverted)
			}
			else{
				tiltAngle -=1;
			}
		}
		console.log(tiltAngle);

	}
	if(e.key === "ArrowDown") {
		if(!inverted) {
			if(tiltAngle - 3 < -90) {
				panAngle += 180;
				inverted = true;
				console.log("inverted?" + inverted)
			}
			else{
				tiltAngle -= 1;
			}
		}
		if(inverted) {
			if(tiltAngle + 3 > 90) {
				panAngle+=180;
				inverted = false;
				console.log("inverted?" + inverted)
			}
			else{
				tiltAngle += 1;
			}
		}
		console.log(tiltAngle);

	}
	if(e.key === "ArrowLeft") {
		if(inverted) {
			panAngle+= 1;
		}
		else{
			panAngle-=1;
		}
		console.log(panAngle);

	}
	if(e.key === "ArrowRight") {
		if(inverted) {
			panAngle-= 1;
		}
		else{
			panAngle+=1;
		}
		console.log(panAngle);

	}
  })

  //adding mouse drag interaction
  document.addEventListener("mousedown", (ev) => {
	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
  	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
  	var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
//	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
	
	g_isDrag = true;											// set our mouse-dragging flag
	g_xMclik = x;													// record where mouse-dragging began
	g_yMclik = y;
	console.log(x,y);
  })
  document.addEventListener("mousemove", (ev) => {
	if(g_isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
	//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
  	var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);		// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//									-1 <= y < +1.
							 (canvas.height/2);
	//	console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);

	// find how far we dragged the mouse:
	g_xMdragTot += (x - g_xMclik);			// Accumulate change-in-mouse-position,&
	g_yMdragTot += (y - g_yMclik);

	g_xMclik = x;											// Make next drag-measurement from here.
	g_yMclik = y;
	console.log(x, y);
  })
  document.addEventListener("mouseup", (ev) => {
	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
	var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
							 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	  var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							   (canvas.height/2);
	  console.log('myMouseUp  (CVV coords  ):\n\t x, y=\t',x,',\t',y);
	  
	  g_isDrag = false;											// CLEAR our mouse-dragging flag, and
	  // accumulate any final bit of mouse-dragging we did:
	  g_xMdragTot += (x - g_xMclik);
	  g_yMdragTot += (y - g_yMclik);
  })

  var mvpMatrix = new Matrix4();

//-----------------  
  // Start drawing: create 'tick' variable whose value is this function:
  var tick = function() {
    currentAngle = animate(currentAngle);  // Update the rotation angle
    drawAll(gl, n, currentAngle, modelMatrix, u_ModelMatrix, mvpMatrix, u_MvpMatrix);   // Draw shapes
    // report current angle on console
    //console.log('currentAngle=',currentAngle);
    requestAnimationFrame(tick, canvas);   
    									// Request that the browser re-draw the webpage
  };
  tick();							// start (and continue) animation: draw current image
    
}

function initVertexBuffer(gl) {
//==============================================================================
// Create one giant vertex buffer object (VBO) that holds all vertices for all
// shapes.
 
 	// Make each 3D shape in its own array of vertices:
	makeCylinder(16, 1.1, [0.2, 0.2, 0.2], [0.4, 0.7, 0.4], [0.5, 0.5, 1.0]);
	makeCylinder(4, 1, [.75, .9, .4], [.3, .8, .8], [.1, .9, .67]);
	makeCone();
  	makeGroundGrid();				// create, fill the gndVerts array
  // how many floats total needed to store all shapes?
	var mySiz = (coneVerts.length + gndVerts.length);
	cylVertsMulti.forEach((cylVert) => {
		mySiz += cylVert.length;
	})

	// How many vertices total?
	var nn = mySiz / floatsPerVertex;
	console.log('nn is', nn, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);
	// Copy all shapes into one big Float32 array:
  	var colorShapes = new Float32Array(mySiz);
	// Copy them:  remember where to start for each shape:
	cylStart0 = 0;							// we stored the cylinder first.
  	for(i=0,j=0; j< cylVertsMulti[0].length; i++,j++) {
  		colorShapes[i] = cylVertsMulti[0][j];
	}
	cylStart1 = i;
	for(j = 0; j < cylVertsMulti[1].length; i++, j++) {
		colorShapes[i] = cylVertsMulti[1][j]
	}
	coneStart = i;
	for(j = 0; j < coneVerts.length; i++, j++) {
		colorShapes[i] = coneVerts[j];
	}
	gndStart = i;						// next we'll store the ground-plane;
	for(j=0; j< gndVerts.length; i++, j++) {
		colorShapes[i] = gndVerts[j];
	}
  // Create a buffer object on the graphics hardware:
  var shapeBufferHandle = gl.createBuffer();  
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  // Bind the the buffer object to target:
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  // Transfer data from Javascript array colorShapes to Graphics system VBO
  // (Use sparingly--may be slow if you transfer large shapes stored in files)
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);
    
  //Get graphics system's handle for our Vertex Shader's position-input variable: 
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }

  var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?

  // Use handle to specify how to retrieve **POSITION** data from our VBO:
  gl.vertexAttribPointer(
  		a_Position, 	// choose Vertex Shader attribute to fill with data
  		4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
  		gl.FLOAT, 		// data type for each value: usually gl.FLOAT
  		false, 				// did we supply fixed-point data AND it needs normalizing?
  		FSIZE * floatsPerVertex, // Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  		0);						// Offset -- now many bytes from START of buffer to the
  									// value we will actually use?
  gl.enableVertexAttribArray(a_Position);  
  									// Enable assignment of vertex buffer object's position data

  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  // Use handle to specify how to retrieve **COLOR** data from our VBO:
  gl.vertexAttribPointer(
  	a_Color, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  	FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w
  									
  gl.enableVertexAttribArray(a_Color);  
  									// Enable assignment of vertex buffer object's position data

	//--------------------------------DONE!
  // Unbind the buffer object 
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return nn;
}

// simple & quick-- 
// I didn't use any arguments such as color choices, # of verts,slices,bars, etc.
// YOU can improve these functions to accept useful arguments...
//
function makeCone() {
	var centerColor = new Float32Array([1.0, 1.0, 1.0]);
	var topColor = new Float32Array([1.0, 0.25, 0.25]);
	var botColor = new Float32Array([0.8, 0.8, 0.1]);
	var radius = 1;
	var botVerts = 12;
	coneVerts = new Float32Array(((botVerts*4)-2)*floatsPerVertex);
	for(v = 1, j = 0; v < 2 * botVerts+2; v++, j+=floatsPerVertex) {
		if(v%2 == 0) {
			coneVerts[j] = 0;
			coneVerts[j+1] = 0;
			coneVerts[j+2] = 1;
			coneVerts[j+3] = topColor[0];
			coneVerts[j+4] = topColor[1];
			coneVerts[j+5] = topColor[2];
		}
		else {
			coneVerts[j] = Math.cos(Math.PI*(v-1)/botVerts);
			coneVerts[j+1] = Math.sin(Math.PI*(v-1)/botVerts);
			coneVerts[j+2] = 0;
			coneVerts[j+3] = botColor[0];
			coneVerts[j+4] = botColor[1];
			coneVerts[j+5] = botColor[2];
		}
	}
	for(v = 1; v < 2 * botVerts+2; v++, j+=floatsPerVertex) {
		if(v%2 == 0) {
			coneVerts[j] = 0;
			coneVerts[j+1] = 0;
			coneVerts[j+2] = 0;
			coneVerts[j+3] = centerColor[0];
			coneVerts[j+4] = centerColor[1];
			coneVerts[j+5] = centerColor[2];
		}
		else {
			coneVerts[j] = Math.cos(Math.PI*(v-1)/botVerts);
			coneVerts[j+1] = Math.sin(Math.PI*(v-1)/botVerts);
			coneVerts[j+2] = 0;
			coneVerts[j+3] = botColor[0];
			coneVerts[j+4] = botColor[1];
			coneVerts[j+5] = botColor[2];
		}
	}
}

function makePyramid() {
//==============================================================================
// Make a 4-cornered pyramid from one OpenGL TRIANGLE_STRIP primitive.
// All vertex coords are +/1 or zero; pyramid base is in xy plane.

  	// YOU write this one...
}


function makeCylinder(n, radius, centerColor, topColor, bottomColor) {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design described in notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
 var ctrColr = new Float32Array([centerColor[0], centerColor[1], centerColor[2]]);	// dark gray
 var topColr = new Float32Array([topColor[0], topColor[1], topColor[2]]);	// light green
 var botColr = new Float32Array([bottomColor[0], bottomColor[1], bottomColor[2]]);	// light blue
 var capVerts = n;	// # of vertices around the topmost 'cap' of the shape
 var botRadius = radius;		// radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 var cylVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 

	// Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {	
		// skip the first vertex--not needed.
		if(v%2==0)
		{				// put even# vertices at center of cylinder's top cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,1,1
			cylVerts[j+1] = 0.0;	
			cylVerts[j+2] = 1.0; 
			cylVerts[j+3] = 1.0;			// r,g,b = topColr[]
			cylVerts[j+4]=ctrColr[0]; 
			cylVerts[j+5]=ctrColr[1]; 
			cylVerts[j+6]=ctrColr[2];
		}
		else { 	// put odd# vertices around the top cap's outer edge;
						// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
						// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
			cylVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);			// x
			cylVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts, so we
			//	 can simplify cos(2*PI * (v-1)/(2*capVerts))
			cylVerts[j+2] = 1.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j+4]=topColr[0]; 
			cylVerts[j+5]=topColr[1]; 
			cylVerts[j+6]=topColr[2];			
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
		if(v%2==0)	// position all even# vertices along top cap:
		{		
				cylVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);		// x
				cylVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);		// y
				cylVerts[j+2] = 1.0;	// z
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				cylVerts[j+4]=topColr[0]; 
				cylVerts[j+5]=topColr[1]; 
				cylVerts[j+6]=topColr[2];			
		}
		else		// position all odd# vertices along the bottom cap:
		{
				cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
				cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
				cylVerts[j+2] =-1.0;	// z
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				cylVerts[j+4]=botColr[0]; 
				cylVerts[j+5]=botColr[1]; 
				cylVerts[j+6]=botColr[2];			
		}
	}
	// Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		if(v%2==0) {	// position even #'d vertices around bot cap's outer edge
			cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			cylVerts[j+2] =-1.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j+4]=botColr[0]; 
			cylVerts[j+5]=botColr[1]; 
			cylVerts[j+6]=botColr[2];		
		}
		else {				// position odd#'d vertices at center of the bottom cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			cylVerts[j+1] = 0.0;	
			cylVerts[j+2] =-1.0; 
			cylVerts[j+3] = 1.0;			// r,g,b = botColr[]
			cylVerts[j+4]=botColr[0]; 
			cylVerts[j+5]=botColr[1]; 
			cylVerts[j+6]=botColr[2];
		}
	}
	cylVertsMulti.push(cylVerts);
}

function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

	var xcount = 100;			// # of lines to draw in x,y to make the grid.
	var ycount = 100;		
	var xymax	= 50.0;			// grid size; extends to cover +/-xymax in x and y.
 	var xColr = new Float32Array([1.0, 1.0, 0.3]);	// bright yellow
 	var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.
 	
	// Create an (global) array to hold this ground-plane's vertices:
	gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
						// draw a grid made of xcount+ycount lines; 2 vertices per line.
						
	var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
	
	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
		if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
			gndVerts[j  ] = -xymax + (v  )*xgap;	// x
			gndVerts[j+1] = -xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = xColr[0];			// red
		gndVerts[j+5] = xColr[1];			// grn
		gndVerts[j+6] = xColr[2];			// blu
	}
	// Second, step thru y values as wqe make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = yColr[0];			// red
		gndVerts[j+5] = yColr[1];			// grn
		gndVerts[j+6] = yColr[2];			// blu
	}
}

function drawAll(gl, n, currentAngle, modelMatrix, u_ModelMatrix, mvpMatrix, u_MvpMatrix) {
//==============================================================================
  // Clear <canvas>  colors AND the depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  modelMatrix.setIdentity();    // DEFINE 'world-space' coords.

/*
// STEP 2: add in a 'perspective()' function call here to define 'camera lens':
  modelMatrix.perspective(	??,   // FOVY: top-to-bottom vertical image angle, in degrees
                            ??,   // Image Aspect Ratio: camera lens width/height
                           	??,   // camera z-near distance (always positive; frustum begins at z = -znear)
                        		??);  // camera z-far distance (always positive; frustum ends at z = -zfar)

*/

/*
//  STEP 1:
// Make temporary view matrix that is still close to the origin and
// won't lose sight of our current CVV contents when used without 
// a properly-constructed projection matrix.
//TEMPORARY: 1/10th size camera pose to see what's in CVV locations
  modelMatrix.lookAt( ??, ??, ??,	// center of projection
                      ??, ??, ??,	// look-at point 
                      ??, ??, ??);	// View UP vector.
*/

/*
// STEP 3: 
//Replace the temporary view matrix with your final view matrix...
// GOAL: camera positioned at 3D point (5,5,3), looking at the 
//       3D point (-1,-2,-0.5),  using up vector (0,0,1).

  modelMatrix.lookAt( ??, ??, ??,	// center of projection
                      ??, ??, ??,	// look-at point 
                      ??, ??, ??);	// View UP vector.
*/

  //===========================================================
  //
  pushMatrix(modelMatrix);     // SAVE world coord system;
    	//-------Draw Spinning Cylinder:
    modelMatrix.scale(0.2, 0.2, 0.2);
	modelMatrix.translate(0, 0, 1);
	var dist = Math.sqrt(g_xMdragTot*g_xMdragTot + g_yMdragTot*g_yMdragTot);
	modelMatrix.rotate(dist*120.0, 0.0, -g_yMdragTot+0.0001, -g_xMdragTot+0.0001);
	pushMatrix(modelMatrix);
		modelMatrix.scale(.2, .2, 1);
    	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    	// Draw the cylinder's vertices, and no other vertices:
    	gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
    							cylStart0/floatsPerVertex, // start at this vertex number, and
    							cylVertsMulti[0].length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();
	modelMatrix.scale(.9,.9,.9);
	pushMatrix(modelMatrix);
		modelMatrix.translate(0,0,1);
		modelMatrix.rotate(currentAngle, -1, 0, 0);
		modelMatrix.scale(.2,.2,1);
		modelMatrix.translate(0, 0, 1);
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
			cylStart0/floatsPerVertex, // start at this vertex number, and
			cylVertsMulti[0].length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
		modelMatrix.translate(0,0,1);
		modelMatrix.rotate(currentAngle + 120, -1, 0, 0);
		modelMatrix.scale(.2,.2,1);
		modelMatrix.translate(0, 0, 1);
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
			cylStart0/floatsPerVertex, // start at this vertex number, and
			cylVertsMulti[0].length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
		modelMatrix.translate(0,0,1);
		modelMatrix.rotate(currentAngle+240, -1, 0, 0);
		modelMatrix.scale(.2,.2,1);
		modelMatrix.translate(0, 0, 1);
		gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
			cylStart0/floatsPerVertex, // start at this vertex number, and
			cylVertsMulti[0].length/floatsPerVertex);	// draw this many vertices.
	modelMatrix = popMatrix();
  modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.

  startPositions = [2,3,0, -2,0,0, -1,-1,0, 5, -1, 0]
  frequencies = [1, 1.71, 0.83, 2.6]
  phases = [0, 30, -30, 90];
  amplitudes = [5, 13, 8, 3]
  for(i = 0; i < startPositions.length; i+=3) {
	pushMatrix(modelMatrix);
	modelMatrix.translate(startPositions[i], startPositions[i+1], startPositions[i+2]);
	modelMatrix.scale(.1, .1, .1);
	modelMatrix.translate(-1, 0, 1);
	modelMatrix.rotate(90, 0, 1, 0);
	modelMatrix.translate(0, amplitudes[i/3]*Math.cos((boxRotate+phases[i/3])*frequencies[i/3]), amplitudes[i/3]*Math.sin((boxRotate+phases[i/3])*frequencies[i/3]));
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
		gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
			cylStart1/floatsPerVertex, // start at this vertex number, and
			cylVertsMulti[1].length/floatsPerVertex);	// draw this many vertices.
  	modelMatrix = popMatrix();
  }
  pushMatrix(modelMatrix);
  	modelMatrix.scale(.2, .2, .2);
	modelMatrix.translate(4*eyePosition[0]+1, 4*eyePosition[1], 4*eyePosition[2]-1);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
		//gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
		//	coneStart/floatsPerVertex, // start at this vertex number, and
		//	coneVerts.length/floatsPerVertex);	// draw this many vertices.
  modelMatrix = popMatrix();

  //===========================================================
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
  	//---------Draw Ground Plane, without spinning.
  	// position it.
  	modelMatrix.translate( 0.4, -0.4, 0.0);	
  	modelMatrix.scale(0.1, 0.1, 0.1);				// shrink by 10X:

  	// Drawing:
  	// Pass our current matrix to the vertex shaders:
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    // Draw just the ground-plane's vertices
    gl.drawArrays(gl.LINES, 								// use this drawing primitive, and
    						  gndStart/floatsPerVertex,	// start at this vertex number, and
    						  gndVerts.length/floatsPerVertex);	// draw this many vertices.
  modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================

    mvpMatrix.setPerspective(30, 1, 1, 100);
		mvpMatrix.lookAt(eyePosition[0], eyePosition[1], eyePosition[2], //eye position
			eyePosition[0]+Math.cos(Math.PI*panAngle/180)*Math.cos(Math.PI*tiltAngle/180),  //x value of look at point
			eyePosition[1]+Math.sin(-Math.PI*panAngle/180)*Math.cos(Math.PI*tiltAngle/180), //y value of look at point
			eyePosition[2]+Math.sin(Math.PI*tiltAngle/180), //z value look at point
			0, 0, inverted? -1: 1); //up vector
		gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();

function animate(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;    
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
//  if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
//  if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  boxRotate = (boxRotate + elapsed/1000) % 360;

  return newAngle %= 360;
}

//==================HTML Button Callbacks
function nextShape() {
	shapeNum += 1;
	if(shapeNum >= shapeMax) shapeNum = 0;
}

function spinDown() {
 ANGLE_STEP -= 25; 
}

function spinUp() {
  ANGLE_STEP += 25; 
}

function runStop() {
  if(ANGLE_STEP*ANGLE_STEP > 1) {
    myTmp = ANGLE_STEP;
    ANGLE_STEP = 0;
  }
  else {
  	ANGLE_STEP = myTmp;
  }
}

main();