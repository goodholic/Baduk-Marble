using UnityEditor;
using UnityEngine;

public class BuildScript
{
    public static void BuildWebGL()
    {
        string[] scenes = { "Assets/Scenes/SampleScene.unity" };
        string buildPath = "WebGLBuild";

        // 파란 화면 수정: Linear → Gamma (WebGL 호환성)
        PlayerSettings.colorSpace = ColorSpace.Gamma;

        // WebGL 텍스처 압축 비활성화 (호환성 최우선)
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;

        // WebGL 메모리 확장
        PlayerSettings.WebGL.memorySize = 64;

        BuildPipeline.BuildPlayer(scenes, buildPath, BuildTarget.WebGL, BuildOptions.None);
        Debug.Log("WebGL Build Complete: " + buildPath);
    }
}
