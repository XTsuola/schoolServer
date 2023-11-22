// deno-lint-ignore-file
import { Router } from "https://deno.land/x/oak@v10.2.1/router.ts";
import { helpers } from "https://deno.land/x/oak@v10.2.1/mod.ts";
import {
  add,
  deleteData,
  findLast,
  queryAll,
  queryCount,
  queryOne,
  update,
} from "../mongoDB/index.ts";
import { Document, ObjectId } from "https://deno.land/x/mongo@v0.29.3/mod.ts";
import { decode } from "https://deno.land/std@0.138.0/encoding/base64.ts";
import { verifyToken } from "../verifyToken/index.ts";

export function system(router: Router): void {
  router
    .get("/getUserList", verifyToken, async (ctx): Promise<void> => { // 获取用户列表
      const params: any = helpers.getQuery(ctx);
      let sql: any = {};
      for (let key in params) {
        if (key == "username") {
          sql = { ...sql, [key]: { "$regex": params[key] } };
        }
      }
      const total: number = await queryCount(sql, "user");
      const data: Document[] = await queryAll(
        sql,
        "user",
        parseInt(params.pageSize),
        parseInt(params.pageNo),
      );
      for (let i = 0; i < data.length; i++) {
        const list = data[i].tag.map((item: number) => {
          return {
            id: item,
          };
        });
        const sql2 = {
          $or: list,
        };
        const data2: Document[] = await queryAll(sql2, "tag");
        data[i].tagObj = data2;
      }
      ctx.response.body = {
        "code": 200,
        "rows": data,
        "total": total,
        "msg": "查询成功",
      };
    }).get("/getUserDetail", verifyToken, async (ctx): Promise<void> => { // 获取用户详情
      const params: any = helpers.getQuery(ctx);
      let sql: any = { id: parseInt(params.id) };
      const data: any = await queryOne(sql, "user");
      const list = data.tag.map((item: number) => {
        return {
          id: item,
        };
      });
      const sql2 = {
        $or: list,
      };
      const data2: Document[] = await queryAll(sql2, "tag");
      data.tagObj = data2;
      delete data.password;
      ctx.response.body = {
        "code": 200,
        "rows": data,
        "msg": "查询成功",
      };
    }).post("/updateImg", verifyToken, async (ctx): Promise<void> => { // 修改头像
      const params: any = await ctx.request.body({
        type: "json",
      }).value;
      const sql = { "id": params.id };
      const res: Document | undefined = await queryOne(sql, "user");
      if (res) {
        const baseName: string = res.img;
        if (baseName) {
          Deno.remove(`${Deno.cwd()}/public/headImg/${baseName}`);
        }
      }
      try {
        const imgName: string = params.id + "_" + Date.now() + ".jpg";
        const path = `${Deno.cwd()}/public/headImg/${imgName}`;
        const base64: any = params.img.replace(/^data:image\/\w+;base64,/, "");
        const dataBuffer: Uint8Array = decode(base64);
        await Deno.writeFile(path, dataBuffer);
        const param1 = { id: params.id };
        const param2 = { img: imgName };
        const data = await update(param1, param2, "user");
        ctx.response.body = {
          "code": 200,
          "rows": data,
          "msg": "修改成功",
        };
      } catch (error) {
        throw (error);
      }
    }).get("/getTagList", async (ctx): Promise<void> => { // 获取标签列表
      const params: any = helpers.getQuery(ctx);
      let sql: any = {};
      for (let key in params) {
        if (key == "name") {
          sql = { ...sql, [key]: { "$regex": params[key] } };
        }
      }
      const total: number = await queryCount(sql, "tag");
      const data: Document[] = await queryAll(
        sql,
        "tag",
        parseInt(params.pageSize),
        parseInt(params.pageNo),
      );
      ctx.response.body = {
        "code": 200,
        "rows": data,
        "total": total,
        "msg": "查询成功",
      };
    }).post("/addTag", verifyToken, async (ctx): Promise<void> => { // 新增标签
      const params: any = await ctx.request.body({
        type: "json",
      }).value;
      const lastInfo: Document[] = await findLast("tag");
      let id: number = 0;
      if (lastInfo.length) {
        id = lastInfo[0].id;
      }
      const sql = {
        id: id + 1,
        name: params.name,
        color: params.color,
      };
      const data: any = await add(sql, "tag");
      ctx.response.body = {
        "code": 200,
        "rows": data,
        "msg": "新增成功",
      };
    }).post(
      "/editTag",
      verifyToken,
      async (ctx): Promise<void> => { // 修改标签
        const params: any = await ctx.request.body({
          type: "json",
        }).value;
        const param1 = { _id: new ObjectId(params._id) };
        const param2 = {
          id: params.id,
          name: params.name,
          color: params.color,
        };
        const data = await update(param1, param2, "tag");
        ctx.response.body = {
          "code": 200,
          "rows": data,
          "msg": "修改成功",
        };
      },
    ).get("/deleteTag", verifyToken, async (ctx): Promise<void> => { // 删除标签
      const params: any = helpers.getQuery(ctx);
      const sql = { _id: new ObjectId(params._id) };
      const data: number = await deleteData(sql, "tag");
      ctx.response.body = {
        "code": 200,
        "rows": data,
        "msg": "删除成功",
      };
    });
}
