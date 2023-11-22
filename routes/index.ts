import { Router } from "https://deno.land/x/oak@v10.2.1/mod.ts";
import { login } from "./login.ts";
import { system } from "./system.ts";

const router = new Router();

login(router);
system(router)

export default router;