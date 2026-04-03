## 2026-04-03 集成astraflow星图
1. 新增模型平台聚合配置（支持文本/图片/视频），配置一个KEY就可以使用完整功能并且可以切换多种模型，根据读取官方API文档实现集成。（可以参考Chatfire实现，他也是一个统一的模型聚合平台）
2. 右上角API设置新增渠道 星图Astraflow, 选择后自动填充Base URL，保存后则模型切换成了星图的模型选项，
3. 星图Astraflow默认的文本选择deepseek-ai/DeepSeek-V3.2，图片模型：dgemini-3.1-flash-image-preview，视频模型：doubao-seedance-1-5-pro-251215
4. 文本模型可通过接口获取，图片/视频模型需要写死配置（所支持的模型参考：平台概述-包含所支持的所有模型）
5. 官方API文档链接：docs/rag/官方文档地址.md
6. 开发完成后需要写测试用默认模型调试星图文本/图片/视频/接口（星图KEY：AoD0tmlLpRU8uAqH00209fF9-40cE-4d89-9D33-C4C20289）调试接口是否正常，如果欠费也需要提示充值。
7. 星图的图片/视频模型ID配置需要写死，根据 https://docs.ucloud.cn/modelverse/README 查询对应的接口设置文档
图片生成
gemini-2.5-flash-image ( Nano Banana )
gemini-3-pro-image ( Nano Banana Pro )
gemini-3.1-flash-image-preview ( Nano Banana 2 )
flux-2-pro
flux-kontext-pro
flux-pro-1.1
black-forest-labs/flux.1-dev
black-forest-labs/flux-kontext-pro
black-forest-labs/flux-kontext-pro/multi
black-forest-labs/flux-kontext-pro/text-to-image
stepfun-ai/step1x-edit
black-forest-labs/flux-kontext-max
black-forest-labs/flux-kontext-max/multi
black-forest-labs/flux-kontext-max/text-to-image
Qwen/Qwen-Image-Edit
Qwen/Qwen-Image
gpt-image-1
gpt-image-1.5
doubao-seedream
视频生成
OpenAI/Sora2-T2V
OpenAI/Sora2-I2V
OpenAI/Sora-2
Wan-AI/Wan2.2-I2V
Wan-AI/Wan2.2-T2V
Wan-AI/Wan2.5-I2V
Wan-AI/Wan2.5-T2V
Wan-AI/Wan2.6-I2V
Wan-AI/Wan2.6-T2V
MiniMax/Hailuo-2.3-I2V
MiniMax/Hailuo-2.3-T2V
MiniMax/Hailuo-2.3-Fast
MiniMax/Hailuo-02
Vidu/文生视频
Vidu/图生视频
Vidu/参考图生视频
Vidu/首尾帧生视频
Vidu/视频延长
Vidu/对口型
Vidu/一键生成MV
doubao-seedance-1-5-pro
kling-video-o1
kling-v2-6/图生视频
kling-v2-6/文生视频
kling-v3-omni/多模态视频生成
Veo-3.1/文图生视频
8. 分镜图整组执行执行时，需要可以勾选那些图片并且需要跟批量生成视频操作弹出一样的框选择生图的模型
  - 分镜图选择需要点击文字也可以选中（已实现：整行可点）
  - 图片尺寸默认16:9（已实现：无节点 size 时优先 16:9 横版）
  - 选择模型时选项太多导致无法选择超出选项框的模型（已实现：可滚动下拉）
  - 选择模型后，生图模型调用方式不对，没有参考官方文档调用接口文档（docs/rag/官方文档地址.md）。https://api.modelverse.cn/v1beta/models/gemini-3.1-flash-image-preview:generateContent（已实现：路径 ID 映射、contents.role=user、2.5 与 3.x 分支、参考图 parts）
9. 脚本生成器节点/视频节点等模型时选项太多导致无法选择超出选项框的模型（已实现：Script/VideoConfig/Video/Image/LLM 节点与画布批量视频共用可滚动下拉工具）
10. sora图生视频生成参数first_frame_url不支持base64图片，需要先将图片上传到火山引擎OSS获取链接后再使用
11. 刷新页面后生成的图片不显示了



