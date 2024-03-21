"use client";
import React, { useEffect, useState } from "react";
import { Button, Form, Input, Image, Spin, message } from "antd";
import axios from "axios";
import { NFTStorage, File } from "nft.storage";
import { useAccount, useWriteContract } from "wagmi";

const layout = {
  labelCol: { span: 4 },
};

export default function Generator() {
  const [disabled, setDisabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState("");
  const account = useAccount();
  const { writeContract } = useWriteContract();

  const onFinish = (values: any) => {
    console.log(values);
  };
  useEffect(() => {
    if (name && desc) {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  }, [name, desc]);
  const createImg = async () => {
    const URL = `https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2`;
    const res = await axios({
      url: URL,
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_HUGGING_FACE_API_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        inputs: desc,
        options: { wait_for_model: true },
      }),
      responseType: "arraybuffer",
    });
    const type = res.headers["content-type"];
    const data = res.data;

    const base64data = Buffer.from(data).toString("base64");
    const img = `data:${type};base64,` + base64data;
    setImage(img);
    return img;
  };
  const uploadImage = async (imgRaw: any) => {
    const nftstorage = new NFTStorage({
      token: process.env.NEXT_PUBLIC_NFT_STORAGE_API_KEY as string,
    });

    const { ipnft } = await nftstorage.store({
      image: new File([imgRaw], "image.jpeg", { type: "image/jpeg" }),
      name: name,
      description: desc,
    });
    const url = `https://ipfs.io/ipfs/${ipnft}/metadata.json`;
    return url;
  };
  const mintImage = async (url: string) => {};
  const submit = async () => {
    if (!account.isConnected) {
      message.warning("请先链接钱包");
      return;
    }
    setLoading(true);
    const imgRaw = await createImg();
    const url = await uploadImage(imgRaw);
    await mintImage(url);
    setLoading(false);
  };
  return (
    <div className="flex justify-center items-center px-[300px] mt-[100px]">
      <Form {...layout} size="large" onFinish={onFinish} className="w-[300px]">
        <Form.Item label="">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入名称"
          />
        </Form.Item>
        <Form.Item label="">
          <Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="请输入描述"
          />
        </Form.Item>
        <Button
          loading={loading}
          onClick={submit}
          disabled={disabled}
          type="primary"
          htmlType="submit"
          className="w-full"
        >
          Submit
        </Button>
      </Form>
      <div className="flex overflow-hidden justify-center items-center ml-[50px] w-[400px] h-[400px] border-[#0E76FD] rounded-[10px] border-dashed border-[4px] ">
        {loading ? (
          <Spin size={"large"} />
        ) : (
          image && (
            <Image
              alt=""
              width={"400px"}
              height={"400px"}
              preview={false}
              src={image}
            />
          )
        )}
      </div>
    </div>
  );
}
