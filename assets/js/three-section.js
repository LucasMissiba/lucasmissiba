(() => {
  const container = document.getElementById("three-container");
  if (!container) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const sketchfabUid = (window.SITE_CONFIG && window.SITE_CONFIG.sketchfabModelUid) || "";
  if (sketchfabUid) {
    container.innerHTML = "";
    const iframe = document.createElement("iframe");
    iframe.className = "three-embed";
    iframe.title = "Kha'Zix 3D (Sketchfab)";
    iframe.allow = "autoplay; fullscreen; xr-spatial-tracking";
    iframe.setAttribute("allowfullscreen", "true");
    container.appendChild(iframe);

    function loadSketchfabApi() {
      return new Promise((resolve, reject) => {
        if (window.Sketchfab) return resolve(window.Sketchfab);
        const s = document.createElement("script");
        s.src = "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";
        s.async = true;
        s.onload = () => resolve(window.Sketchfab);
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    (async () => {
      try {
        const Sketchfab = await loadSketchfabApi();
        const client = new Sketchfab(iframe);
        client.init(sketchfabUid, {
          transparent: 1,
          autostart: prefersReduced ? 0 : 1,
          preload: 1,
          dnt: 1,
          ui_infos: 0,
          ui_hint: 0,
          ui_controls: 0,
          ui_settings: 0,
          ui_fullscreen: 0,
          ui_watermark: 0,
          ui_animations: 0,
          success: (api) => {
            api.start();
            api.addEventListener("viewerready", () => {
              try {
                api.getCameraLookAt((pos, target) => {
                  const zoomFactor = 2.2; // afasta ainda mais para garantir modelo completo
                  const dir = [pos[0] - target[0], pos[1] - target[1], pos[2] - target[2]];
                  const newPos = [
                    target[0] + dir[0] * zoomFactor,
                    target[1] + dir[1] * zoomFactor,
                    target[2] + dir[2] * zoomFactor,
                  ];
                  api.setCameraLookAt(newPos, target, 0.6, () => {});
                });
              } catch (_) {}
            });
          },
          error: () => {
            // Fallback simples
            iframe.src = `https://sketchfab.com/models/${sketchfabUid}/embed?transparent=1&ui_infos=0&ui_hint=0&ui_watermark=0&ui_controls=0&ui_settings=0&ui_fullscreen=0&ui_animations=0&autostart=${prefersReduced ? 0 : 1}`;
          }
        });
      } catch (e) {
        // Fallback para embed direto
        iframe.src = `https://sketchfab.com/models/${sketchfabUid}/embed?transparent=1&ui_infos=0&ui_hint=0&ui_watermark=0&ui_controls=0&ui_settings=0&ui_fullscreen=0&ui_animations=0&autostart=${prefersReduced ? 0 : 1}`;
      }
    })();

    // Pequenas mascaras para ocultar titulo/topbar e timeline sem afetar o modelo
    const topMask = document.createElement("div");
    topMask.className = "three-mask-top";
    const bottomMask = document.createElement("div");
    bottomMask.className = "three-mask-bottom";
    container.appendChild(topMask);
    container.appendChild(bottomMask);

    // Mantemos interações padrão (zoom via scroll/pinch habilitado) para experiência completa

    return; // usa Sketchfab embed/API em vez do renderer local
  }
  (async function initThreePlaceholder() {
    try {
      const threeModule = await import("https://unpkg.com/three@0.161.0/build/three.module.js");
      const loaders = await import("https://unpkg.com/three@0.161.0/examples/jsm/loaders/GLTFLoader.js");
      const THREE = threeModule;
      const { GLTFLoader } = loaders;

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x0a0e17, 18, 42);

      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 1.1, 5);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      container.appendChild(renderer.domElement);

      const hemi = new THREE.HemisphereLight(0x4dd0ff, 0x06080c, 0.8);
      scene.add(hemi);
      const dir = new THREE.DirectionalLight(0xff3cac, 0.9);
      dir.position.set(2, 5, 3);
      scene.add(dir);

      const planeGeo = new THREE.PlaneGeometry(40, 40);
      const planeMat = new THREE.MeshBasicMaterial({ color: 0x0a0e17, transparent: true, opacity: 0.6 });
      const plane = new THREE.Mesh(planeGeo, planeMat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = -1.2;
      scene.add(plane);

      let model = null;
      const loader = new GLTFLoader();

      function tryLoad(url) {
        return new Promise((resolve, reject) => loader.load(url, gltf => resolve(gltf), undefined, reject));
      }

      async function loadModel() {
        const urls = [
          "assets/models/khazix.glb",
          "assets/models/kha-zix.glb",
          "assets/models/KhaZix.glb"
        ];
        for (const url of urls) {
          try {
            const gltf = await tryLoad(url);
            model = gltf.scene;
            scene.add(model);
            fitToView(model);
            return true;
          } catch (e) { /* tenta proximo */ }
        }
        return false;
      }

      function fitToView(object) {
        object.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        object.position.sub(center);
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
        cameraZ *= 1.4;
        camera.position.set(0.2, size.y * 0.15, cameraZ);
        camera.lookAt(0, 0, 0);
      }

      function createPlaceholder() {
        const group = new THREE.Group();
        const geo = new THREE.TorusKnotGeometry(1, 0.35, 220, 36);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x6f3cff,
          emissive: 0x301060,
          emissiveIntensity: 1.2,
          metalness: 0.6,
          roughness: 0.2,
        });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);

        const glowGeo = new THREE.SphereGeometry(1.2, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x4dd0ff, transparent: true, opacity: 0.06 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        group.add(glow);

        scene.add(group);
        model = group;
        fitToView(group);
      }

      let targetRotX = 0, targetRotY = 0;
      function onPointer(e) {
        const hasTouches = "touches" in e;
        const point = hasTouches ? e.touches[0] : e;
        const rect = container.getBoundingClientRect();
        const x = (point.clientX - rect.left) / rect.width;
        const y = (point.clientY - rect.top) / rect.height;
        targetRotY = (x * 2 - 1) * 0.5;
        targetRotX = (-(y * 2 - 1)) * 0.3;
      }
      container.addEventListener("pointermove", onPointer);
      container.addEventListener("touchmove", onPointer);

      const ro = new ResizeObserver(() => {
        camera.aspect = Math.max(1e-6, container.clientWidth / Math.max(1, container.clientHeight));
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      });
      ro.observe(container);

      const clock = new THREE.Clock();
      function animate() {
        const t = clock.getElapsedTime();
        if (model && !prefersReduced) {
          model.rotation.y += (targetRotY - model.rotation.y) * 0.05;
          model.rotation.x += (targetRotX - model.rotation.x) * 0.05;
          model.rotation.z = Math.sin(t * 0.2) * 0.02;
        }
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      }

      const ok = await loadModel();
      if (!ok) createPlaceholder();
      animate();
    } catch (err) {
      console.error("Three placeholder init failed", err);
      container.innerHTML = '<div class="three-fallback">Nao foi possivel carregar a visualizacao 3D.</div>';
    }
  })();
})();


