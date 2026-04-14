using UnityEditor;
using UnityEngine;

public class BuildScript
{
    public static void BuildWebGL()
    {
        string[] scenes = { "Assets/Scenes/SampleScene.unity" };
        string buildPath = "WebGLBuild";

        // Color Space: Gamma (WebGL 호환)
        PlayerSettings.colorSpace = ColorSpace.Gamma;

        // 텍스처 압축 비활성화
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;

        // 메모리 확장
        PlayerSettings.WebGL.memorySize = 128;

        // 예외 처리 (파일 크기 최소화 — WASM 100MB 이하 유지)
        PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;

        BuildPipeline.BuildPlayer(scenes, buildPath, BuildTarget.WebGL, BuildOptions.None);
        Debug.Log("WebGL Build Complete: " + buildPath);
    }
}
