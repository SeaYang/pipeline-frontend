/**
 * 各 DAG 任务节点的日志（mock）。
 * git-sync 使用真实抓取日志；其余节点为贴近真实 CICD 的示例日志。
 *
 * 真实场景下这里应改为按节点 id 请求后端日志接口，例如：
 *   const log = await fetch(`/api/pipelines/${pipelineId}/nodes/${nodeId}/log`).then(r => r.text())
 *
 * key 与 data/go-cicd-template.json 中 dag.tasks[*].name 一一对应。
 */
export const nodeLogs: Record<string, string> = {
  'git-sync': `Warning: Permanently added 'gitee.com.' (ED25519) to the list of known hosts.
HEAD is now at 054a691 实现了一个简单的go http服务
Warning: Permanently added 'gitee.com.' (ED25519) to the list of known hosts.
Warning: Permanently added 'gitee.com.' (ED25519) to the list of known hosts.
From gitee.com:awsomeyangtu/go-web-demo
 * branch            master     -> FETCH_HEAD
Already on 'master'
Your branch is up to date with 'origin/master'.
HEAD is now at 054a691 实现了一个简单的go http服务
latest 5 commits:
054a691 - tuyang, 2 weeks ago : 实现了一个简单的go http服务
7d02ee0 - 涂洋, 2 weeks ago : Initial commit
Already on 'master'
Your branch is up to date with 'origin/master'.
Warning: Permanently added 'gitee.com.' (ED25519) to the list of known hosts.
From gitee.com:awsomeyangtu/go-web-demo
 * branch            master     -> FETCH_HEAD
HEAD is now at 054a691 实现了一个简单的go http服务
 [Info] git-sync 完成，revision=20260708140642077.master.054a691
time="2026-07-08T14:06:44 UTC" level=info msg="sub-process exited" argo=true error="<nil>"
time="2026-07-08T14:06:44 UTC" level=info msg="/tmp/git-repo-path -> /var/run/argo/outputs/parameters//tmp/git-repo-path" argo=true
time="2026-07-08T14:06:44 UTC" level=info msg="/tmp/git-commit-id -> /var/run/argo/outputs/parameters//tmp/git-commit-id" argo=true
time="2026-07-08T14:06:44 UTC" level=info msg="/tmp/git-short-commit-id -> /var/run/argo/outputs/parameters//tmp/git-short-commit-id" argo=true
time="2026-07-08T14:06:44 UTC" level=info msg="/tmp/build-workspace-path -> /var/run/argo/outputs/parameters//tmp/build-workspace-path" argo=true
time="2026-07-08T14:06:44 UTC" level=info msg="/tmp/build-artifact-repo-path -> /var/run/argo/outputs/parameters//tmp/build-artifact-repo-path" argo=true
time="2026-07-08T14:06:44 UTC" level=info msg="/tmp/build-image-repo-path -> /var/run/argo/outputs/parameters//tmp/build-image-repo-path" argo=true
time="2026-07-08T14:06:44 UTC" level=info msg="/tmp/build-artifact-name -> /var/run/argo/outputs/parameters//tmp/build-artifact-name" argo=true
time="2026-07-08T14:06:44 UTC" level=info msg="/tmp/build-image-name -> /var/run/argo/outputs/parameters//tmp/build-image-name" argo=true
time="2026-07-08T14:06:44 UTC" level=info msg="/tmp/build-timestamp -> /var/run/argo/outputs/parameters//tmp/build-timestamp" argo=true`,

  'go-build': `[Info] go-build 开始，仓库=/tmp/git-repo-path，commit=054a691
go: downloading go1.22.5
go: downloading github.com/gin-gonic/gin v1.10.0
> CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X main.version=20260708140642077 -X main.commit=054a691" -o /tmp/build-workspace-path/go-web-demo ./cmd/server
go: compiled go-web-demo, size=8.4MB
> go vet ./...
ok      github.com/awsomeyangtu/go-web-demo    0.93s
> go test ./... -count=1
ok      github.com/awsomeyangtu/go-web-demo/cmd/server    0.42s
ok      github.com/awsomeyangtu/go-web-demo/internal/router    0.18s
 [Info] go-build 完成，产物=/tmp/build-workspace-path/go-web-demo (8.4MB)
time="2026-07-08T14:08:02 UTC" level=info msg="sub-process exited" argo=true error="<nil>"
time="2026-07-08T14:08:02 UTC" level=info msg="/tmp/build-workspace-path -> /var/run/argo/outputs/parameters//tmp/build-workspace-path" argo=true
time="2026-07-08T14:08:02 UTC" level=info msg="/tmp/build-artifact-name -> /var/run/argo/outputs/parameters//tmp/build-artifact-name" argo=true`,

  'go-build-image': `[Info] go-build-image 开始，使用 buildkitd 构建镜像 tar
#1 [internal] load build definition
#1 transferring dockerfile: 280B done
#1 DONE 0.0s
#2 [internal] load .dockerignore
#2 DONE 0.0s
#3 [internal] load metadata for docker.io/library/alpine:3.20
#3 DONE 1.2s
#4 [1/2] FROM docker.io/library/alpine:3.20@sha256:beefdbd
#4 DONE 0.1s
#5 [2/2] COPY go-web-demo /app/go-web-demo
#5 DONE 0.0s
#6 exporting to oci image tar
#6 exporting layers 0.1s done
#6 exporting manifest sha256:9f2a3c1b 0.0s done
#6 sending tarball 8.5MB done
#6 DONE 0.2s
 [Info] go-build-image 完成，镜像 tar=/tmp/build-artifact-repo-path/go-web-demo-20260708140642077.tar (8.5MB)
time="2026-07-08T14:09:11 UTC" level=info msg="sub-process exited" argo=true error="<nil>"
time="2026-07-08T14:09:11 UTC" level=info msg="/tmp/build-artifact-repo-path -> /var/run/argo/outputs/parameters//tmp/build-artifact-repo-path" argo=true`,

  'push-image-nexus3': `[Info] push-image-nexus3 开始，使用 skopeo 推送到 nexus3
Getting image source signatures
Copying blob sha256:a1b2c3d4e5f6 done
Copying blob sha256:7f8e9d0c1b2a done
Copying config sha256:9f2a3c1b4d5e done
Writing manifest to image destination
Storing signatures
time="2026-07-08T14:10:25 UTC" level=info msg="skopeo copy docker-archive:/tmp/build-artifact-repo-path/go-web-demo-20260708140642077.tar docker://nexus3.internal:8083/go-web-demo:20260708140642077" argo=true
 [Info] push-image-nexus3 完成，已推送 nexus3.internal:8083/go-web-demo:20260708140642077
time="2026-07-08T14:10:39 UTC" level=info msg="sub-process exited" argo=true error="<nil>"
time="2026-07-08T14:10:39 UTC" level=info msg="/tmp/build-image-repo-path -> /var/run/argo/outputs/parameters//tmp/build-image-repo-path" argo=true`,

  'go-k8s-deploy-via-api': `[Info] go-k8s-deploy-via-api 开始，直调 k8s API（SSA + rollout 轮询）
time="2026-07-08T14:11:03 UTC" level=info msg="applying Deployment go-web-demo via Server-Side Apply (fieldManager=go-cicd-pipeline)" argo=true
deployment.apps/go-web-demo serverside-applied (5 fields managed)
time="2026-07-08T14:11:03 UTC" level=info msg="waiting for rollout: deployment go-web-demo to become ready (max 5m0s)" argo=true
Waiting for deployment "go-web-demo" rollout to finish: 0 of 1 updated replicas are available...
Waiting for deployment "go-web-demo" rollout to finish: 1 of 1 updated replicas are available...
deployment "go-web-demo" successfully rolled out
 [Info] go-k8s-deploy-via-api 完成，revision=20260708140642077，可用副本=1/1
time="2026-07-08T14:11:48 UTC" level=info msg="sub-process exited" argo=true error="<nil>"`,
}

/** 取某节点的日志，缺失时返回占位提示 */
export function getNodeLog(nodeId: string): string {
  return (
    nodeLogs[nodeId] ??
    `（暂无 ${nodeId} 的日志示例）\n真实场景下此处会展示该节点抓取到的运行日志。`
  )
}
