import {nanoid} from "nanoid";
import fs, {writeFileSync} from "fs";
import AWS from "aws-sdk";
import axios from "axios";
import path from "path";

AWS.config.update({
    region: "us-east-2",
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECERET_KEY,
});

let originDir: string;
let templateDir: string;
let copyDir: string;
let dataDir: string;
let contentsDir: string;
let targetZip: string;

export class Export {
    async Path(body: any, userId: string) {
        const id = nanoid(10);
        const {fileName, dataObj, contents} = body;

        originDir = "${파일 경로}";
        copyDir = originDir + id + "/";
        dataDir = copyDir + "data/";
        contentsDir = copyDir + "contents/";
        targetZip = copyDir + "temp.zip";

        const stream = fs
            .createReadStream(copyDir + fileName)
            .pipe(fs.createWriteStream(targetZip));

        return new Promise((resolve, reject) => {
            stream.on("close", async () => {
                console.log(2);
                // axios를 사용한 파일 다운로드
                console.time("File One file downloaded in axios get");

                await axios
                    .get(dataObj, {responseType: "arraybuffer"})
                    .then((res) => {
                        const buffer = Buffer.from(res.data, "binary");
                        writeFileSync(dataDir + "Data.ts", buffer);
                    });

                console.timeEnd("File One file downloaded in axios get");

                for (const content of contents) {
                    const fileName = path.basename(content);

                    console.time("File Many file downloaded in axios get");

                    await axios
                        .get(content, {responseType: "arraybuffer"})
                        .then((res) => {
                            const buffer = Buffer.from(res.data, "binary");
                            writeFileSync(contentsDir + fileName, buffer);
                        });

                    console.timeEnd("File Many file downloaded in axios get");
                }

                console.log("aaaa");
                // 여기 까지
                // s3 get object를 활용한 파일 다운로드
                console.time("File One file downloaded in s3 get object");

                const s3 = new AWS.S3();
                const params = {
                    Bucket: "${버킷 명}",
                    Key: "${객체 명}",
                };

                s3.getObject(params, (err, data) => {
                    if (err) {
                        console.log(err);
                    } else {
                        fs.writeFileSync(dataDir + "Data.ts", dataObj);
                    }
                });
                console.timeEnd("File One file downloaded in s3 get object");

                for (const content of contents) {
                    const fileName = path.basename(content);

                    const params = {
                        Bucket: "${버킷 명}",
                        Key: fileName,
                    };

                    console.time("File Many file downloaded in s3 get object");
                    s3.getObject(params, (err, data) => {
                        if (err) {
                            console.log(err);
                        } else {
                            fs.writeFileSync(contentsDir + fileName, content);
                        }
                    });
                    console.timeEnd(
                        "File Many file downloaded in s3 get object"
                    );
                }
                // 여기까지

                resolve(true);
            });
        });
    }
}
