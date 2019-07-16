require_relative '../helpers/i18n_helper.rb'
require_relative '../helpers/files.rb'

i18n = I18nHelper.new

def sdk
  SDK.new(@driver)
end

Then(/^I upload (\w+)(?:\s)?(pdf)?$/) do |image, pdf|
  path_to_image = get_asset(image, pdf)
  sdk.file_upload.send_keys(path_to_image)
end

Given(/^I initiate the verification process with(?: (.+)?)?$/) do |locale|
  i18n.load_locale(locale)
  steps %Q{
    Given I navigate to the SDK with "#{locale}"
    Then I click on primary_button (SDK)
  }
end

Given(/^I initiate the verification process using liveness with(?: (.+)?)?$/) do |locale|
  i18n.load_locale(locale)
  steps %Q{
    Given I navigate to the SDK using liveness with "#{locale}"
    Then I click on primary_button (SDK)
  }
end

Given(/^I do( not)? have a camera$/) do |has_no_camera|
  devices = has_no_camera ? '' : '{ kind: "video" }'
  @driver.execute_script('window.navigator.mediaDevices.enumerateDevices = () => Promise.resolve([' + devices + '])')
end

Given(/^I am not using a browser with MediaRecorder API$/) do
  @driver.execute_script('window.MediaRecorder = undefined')
end

Given(/^I navigate to the SDK as a modal/) do
  open_sdk(@driver, { 'useModal' => true, 'useWebcam' => false })
end

When(/^I try to upload (\w+)(?:\s*)(pdf)?( and then retry)?$/) do |document, file_type, should_retry|
  action_button = should_retry ? "take_again" : "confirm"
  if document.include?('passport') || document.include?('llama')
    doc = 'confirm.passport.message'
  elsif document.include? 'identity_card'
    doc = 'confirm.national_identity_card.message'
  elsif document.include?('license') || document.include?('licence')
    doc = 'confirm.driving_licence.message'
  else
    face = 'confirm.face.standard.message'
  end
  
  confirm_key = doc ? doc : face

  steps %Q{
    When I upload #{document} #{file_type}
    Then I should see uploaded_#{file_type}image ()
    And sub_title should include translation for "#{confirm_key}"
    When I click on #{action_button} ()
  }
end

Then(/^I can navigate back to the previous page with title "([^"]*)"$/) do | key |
  steps %Q{
    When I click on back ()
    Then page_title should include translation for "#{key}"
  }
end

When(/^I see the camera permissions priming screen$/) do
  steps %Q{
    Then page_title should include translation for "webcam_permissions.allow_access"
    When I click on primary_button ()
  }
end

Then(/^(.*) should include translation for "([^"]*)"$/) do | page_element, key|
  text = i18n.translate(key)
  steps %Q{
    Then #{page_element} () should contain "#{text}"
  }
end

When(/^I press esc key$/) do
  @driver.switch_to.active_element.send_keys(:escape)
end

Then(/^I can (confirm|decline) privacy terms$/) do | action |
  next unless PRIVACY_FEATURE_ENABLED
  steps %Q{
    Then page_title should include translation for "privacy.title"
    When I click on #{action}_privacy_terms ()
  }
end

Then(/^I am taken to the selfie screen$/) do
  # Skip this test on Travis, due to camera absence
  next if ENV['CI'] == 'true'
  steps %Q{
    When I click on passport ()
    When I try to upload passport
    Then page_title should include translation for "webcam_permissions.allow_access"
    When I click on primary_button ()
    Then page_title should include translation for "capture.face.title"
  }
end
