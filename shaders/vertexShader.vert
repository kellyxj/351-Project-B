uniform mat4 u_ModelMatrix;
  uniform vec2 u_shiver;
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  varying vec4 v_Color;
  void main() {
    float myWave = u_shiver.x * sin( 2.0 * a_Position.y + u_shiver.y);
    vec4 temp = vec4(myWave, myWave, 0, 0);
    gl_Position = u_ModelMatrix * (a_Position + temp);
    gl_PointSize = 10.0;
    v_Color = a_Color;
}