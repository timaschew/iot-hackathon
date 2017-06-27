const socket = require('socket.io-client')('http://localhost:3000')

const Smoothie = require('smoothie')
window.Smoothie = Smoothie

const TimeSeries = Smoothie.TimeSeries
const SmoothieChart= Smoothie.SmoothieChart

window.init = function() {
  var accSmoothie = new SmoothieChart({
    minValue: -3,
    maxValue: 3,
  });
  accSmoothie.streamTo(document.getElementById("acc-canvas"));

  var gyroSmoothie = new SmoothieChart({
    minValue: -50,
    maxValue: 50
  });
  gyroSmoothie.streamTo(document.getElementById("gyro-canvas"));

  var magnetoSmoothie = new SmoothieChart({
    minValue: -70,
    maxValue: 70
  });
  magnetoSmoothie.streamTo(document.getElementById("magneto-canvas"));

  // Data
  var accLine1 = new TimeSeries();
  var accLine2 = new TimeSeries();
  var accLine3 = new TimeSeries();
  const acc = [accLine1, accLine2, accLine3]

  var gyroLine1 = new TimeSeries();
  var gyroLine2 = new TimeSeries();
  var gyroLine3 = new TimeSeries();
  const gyro = [gyroLine1, gyroLine2, gyroLine3]

  var magnetoLine1 = new TimeSeries();
  var magnetoLine2 = new TimeSeries();
  var magnetoLine3 = new TimeSeries();
  const magneto = [magnetoLine1, magnetoLine2, magnetoLine3]

  // Add a random value to each line every second
  socket.on('connect', function() {
      console.log('connected')
  });
  socket.on('/features/accelerometer_0', function(data) {
    // console.log('/features/accelerometer_0')
    console.log('magnetometer_0', data)
    const x = data[0]
    const y = data[1]
    const z = data[2]

    const roll = Math.atan2(x,z) * 180 / Math.PI
    const pitch = Math.atan2(-x, Math.sqrt(y*y + z*z)) * 180 / Math.PI
    // console.log('roll', roll)
    // console.log('pitch', pitch)
    data.forEach((item, index) => {
      acc[index].append(new Date().getTime(), item)
    })
  });
  socket.on('/features/gyrometer_0', function(data) {
      //console.log('gyro', data)
      data.forEach((item, index) => {
        gyro[index].append(new Date().getTime(), item)
      })
  });
  socket.on('/features/magnetometer_0', function(data) {

      data.forEach((item, index) => {
        magneto[index].append(new Date().getTime(), item)
      })
  });
  socket.on('disconnect', function() {
      console.log('disconnected')
  });

  // Add to SmoothieChart
  accSmoothie.addTimeSeries(accLine1, { strokeStyle:'rgb(255, 0, 0)', lineWidth: 3 });
  accSmoothie.addTimeSeries(accLine2, { strokeStyle:'rgb(0, 255, 0)', lineWidth: 3 });
  accSmoothie.addTimeSeries(accLine3, { strokeStyle:'rgb(0, 0, 255)', lineWidth: 3 });

  gyroSmoothie.addTimeSeries(gyroLine1, { strokeStyle:'rgb(255, 0, 0)', lineWidth: 3 });
  gyroSmoothie.addTimeSeries(gyroLine2, { strokeStyle:'rgb(0, 255, 0)', lineWidth: 3 });
  gyroSmoothie.addTimeSeries(gyroLine3, { strokeStyle:'rgb(0, 0, 255)', lineWidth: 3 });

  magnetoSmoothie.addTimeSeries(magnetoLine1, { strokeStyle:'rgb(255, 0, 0)', lineWidth: 3 });
  magnetoSmoothie.addTimeSeries(magnetoLine2, { strokeStyle:'rgb(0, 255, 0)', lineWidth: 3 });
  magnetoSmoothie.addTimeSeries(magnetoLine3, { strokeStyle:'rgb(0, 0, 255)', lineWidth: 3 });

}


window.cube = function() {
  var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);

        var renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        var cubegeometry = new THREE.CubeGeometry(5,2.5,0.2);
        var cubematerial = new THREE.MeshBasicMaterial({wireframe: false, color: 0xffaa00});

        var cube = new THREE.Mesh(cubegeometry, cubematerial);

        scene.add(cube);

        camera.position.z = 6;
        camera.position.x = 1;

        var down = false;
        var sx = 0,
            sy = 0;

        window.onmousedown = function(ev) {
            down = true;
            sx = ev.clientX;
            sy = ev.clientY;
        };
        window.onmouseup = function() {
            down = false;
        };
        window.onmousemove = function(ev) {
            if (down) {
                var dx = ev.clientX - sx;
                var dy = ev.clientY - sy;
                cube.rotation.x += dx * 0.01;
                cube.rotation.z += dy * 0.01;
                sx += dx;
                sy += dy;
            }
        }

        socket.on('/features/accelerometer_0', function(data) {
          const x = data[0]
          const y = data[1]
          const z = data[2]

          console.log('acc', x,y,z)
          cube.rotation.y = x * -1.6;
          cube.rotation.x = (y * -1.6) + 1.6;


        });

        var render = function () {
            requestAnimationFrame(render);

            // cube.rotation.y += 0.01;
            // cube.rotation.x += 0.01;
            // cube.rotation.z += 0.01;

            renderer.render(scene, camera);
        };

        // Calling the render function
        render();
}

