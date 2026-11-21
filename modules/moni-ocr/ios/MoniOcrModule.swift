import ExpoModulesCore
import UIKit
import Vision

/// On-device OCR with Apple Vision. Nothing leaves the device.
public class MoniOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MoniOcr")

    AsyncFunction("recognize") { (uri: String, promise: Promise) in
      guard let url = URL(string: uri),
            let data = try? Data(contentsOf: url),
            let image = UIImage(data: data),
            let cgImage = image.cgImage else {
        promise.reject("E_IMAGE", "Cannot read image at \(uri)")
        return
      }
      // Dimensions after applying the EXIF orientation (what the user sees).
      let width = Double(image.size.width * image.scale)
      let height = Double(image.size.height * image.scale)
      let started = DispatchTime.now()

      let request = VNRecognizeTextRequest { request, error in
        if let error = error {
          promise.reject("E_OCR", error.localizedDescription)
          return
        }
        let observations = (request.results as? [VNRecognizedTextObservation]) ?? []
        let lines: [[String: Any]] = observations.compactMap { obs in
          guard let candidate = obs.topCandidates(1).first else { return nil }
          // Vision boxes are normalized with a bottom-left origin: convert to top-left pixels.
          let b = obs.boundingBox
          return [
            "text": candidate.string,
            "box": [
              b.minX * width,
              (1 - b.maxY) * height,
              b.width * width,
              b.height * height,
            ],
            "confidence": Double(candidate.confidence),
          ]
        }
        let elapsed = Double(DispatchTime.now().uptimeNanoseconds - started.uptimeNanoseconds) / 1_000_000
        promise.resolve([
          "lines": lines,
          "width": width,
          "height": height,
          "engineMs": elapsed,
        ])
      }
      request.recognitionLevel = .accurate
      request.recognitionLanguages = ["fr-FR", "en-US"]
      request.usesLanguageCorrection = true

      let handler = VNImageRequestHandler(
        cgImage: cgImage,
        orientation: CGImagePropertyOrientation(image.imageOrientation),
        options: [:]
      )
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          try handler.perform([request])
        } catch {
          promise.reject("E_OCR", error.localizedDescription)
        }
      }
    }
  }
}

private extension CGImagePropertyOrientation {
  init(_ orientation: UIImage.Orientation) {
    switch orientation {
    case .up: self = .up
    case .upMirrored: self = .upMirrored
    case .down: self = .down
    case .downMirrored: self = .downMirrored
    case .left: self = .left
    case .leftMirrored: self = .leftMirrored
    case .right: self = .right
    case .rightMirrored: self = .rightMirrored
    @unknown default: self = .up
    }
  }
}
