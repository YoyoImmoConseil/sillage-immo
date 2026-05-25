// Barrel: keeps legacy `import { tools } from "./tools"` working while the
// real registry now lives in the per-domain modules under ./tools/.
export { tools } from "./tools/index";
