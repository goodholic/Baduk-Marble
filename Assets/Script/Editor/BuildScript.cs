using UnityEditor;
using UnityEngine;

public class BuildScript
{
    public static void BuildWebGL()
    {
        string[] scenes = { "Assets/Scenes/SampleScene.unity" };
        string buildPath = "WebGLBuild";

        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;

        BuildPipeline.BuildPlayer(scenes, buildPath, BuildTarget.WebGL, BuildOptions.None);
        Debug.Log("WebGL Build Complete: " + buildPath);
    }
}
