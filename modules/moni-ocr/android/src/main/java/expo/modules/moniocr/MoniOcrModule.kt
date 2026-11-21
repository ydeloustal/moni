package expo.modules.moniocr

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** On-device OCR with the bundled ML Kit Latin model. Nothing leaves the device. */
class MoniOcrModule : Module() {
  private val recognizer by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }

  override fun definition() = ModuleDefinition {
    Name("MoniOcr")

    AsyncFunction("recognize") { uri: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("E_NO_CONTEXT", "React context unavailable", null)
        return@AsyncFunction
      }
      val image = try {
        // Applies the EXIF rotation; width/height below are the rotated dimensions.
        InputImage.fromFilePath(context, Uri.parse(uri))
      } catch (e: Exception) {
        promise.reject("E_IMAGE", "Cannot read image: ${e.message}", e)
        return@AsyncFunction
      }
      val started = System.nanoTime()
      recognizer.process(image)
        .addOnSuccessListener { text ->
          val lines = text.textBlocks.flatMap { block ->
            block.lines.map { line ->
              val box = line.boundingBox
              mapOf(
                "text" to line.text,
                "box" to listOf(
                  box?.left ?: 0, box?.top ?: 0, box?.width() ?: 0, box?.height() ?: 0
                ),
                "confidence" to line.confidence.toDouble()
              )
            }
          }
          promise.resolve(
            mapOf(
              "lines" to lines,
              "width" to image.width,
              "height" to image.height,
              "engineMs" to (System.nanoTime() - started) / 1_000_000.0
            )
          )
        }
        .addOnFailureListener { e -> promise.reject("E_OCR", e.message ?: "OCR failed", e) }
    }
  }
}
